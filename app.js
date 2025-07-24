const fs = require('fs');
const path = require('path');
const net = require('net');
const express = require('express');
const mqtt = require('mqtt');
const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));

function loadServers(filePath) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return raw
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => {
            const [name, ip, port, url, interval] = line.split(',').map(s => s.trim());
            return { name,
                     ip,
                     port: parseInt(port),
                     url,
                     interval: parseInt(interval) || 60, 
                     online: false, 
                     lastChecked: 0 };
        });
}

const SERVICES = loadServers(path.join(__dirname, 'servers.list'));

function isHostUp(ip, port, timeout = 1000) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(timeout);
        socket.once('connect', () => {
            socket.destroy();
            resolve(true);
        }).once('timeout', () => {
            socket.destroy();
            resolve(false);
        }).once('error', () => {
            resolve(false);
        }).connect(port, ip);
    });
}

function updateServiceStatusLoop(){
    setInterval(async ()=>{
        const now = Date.now();
        for (const s of SERVICES){
            if (now-s.lastChecked >= s.interval*1000){
                s.online = await isHostUp(s.ip, s.port);
                s.lastChecked = now;
            }
        }
    }, 1000);
}

updateServiceStatusLoop();

app.get('/', async (req, res) => {
    res.render('index', { services: SERVICES });
});

const url = require('url');

app.get('/check/mqtt', (req, res) => {
    const mqttEntry = SERVICES.find(s=>s.url.startsWith('/check/mqtt'));



    const brokerIp = mqttEntry?.ip || '127.0.0.1';
    const brokerPort = mqttEntry?.port || 1883;
    
    const parsedUrl = url.parse(mqttEntry?.url || '', true);

    const mqttUrl = `mqtt://${brokerIp}:${brokerPort}`;

    
    const options = {};
    if(parsedUrl.query.user && parsedUrl.query.pass){
        options.username = parsedUrl.query.user;
        options.password = parsedUrl.query.pass;
    }
    
    const client = mqtt.connect(mqttUrl, options);


    client.on('connect', () => {
        client.publish('internal/portal/test', 'ping', (err) => {
            client.end();
            if (err) {
                res.send(`
                    <h2>MQTT 測試結果：失敗</h2>
                    <p>Broker 位址：${mqttUrl}</p>
                    <p>錯誤原因：${err.message}</p>
                `);
            } else {
                res.send(`
                    <h2>MQTT 測試結果：成功</h2>
                    <p>Broker 位址：${mqttUrl}</p>
                    <p>主題：internal/portal/test</p>
                    <p>訊息：ping</p>
                    <p>登入使用者: ${options.username || '(未使用)'}</p>
                `);
            }
        });
    });

    client.on('error', (err) => {
        res.send(`
            <h2>MQTT 測試結果：無法連線</h2>
            <p>Broker 位址：${mqttUrl}</p>
            <p>錯誤原因：${err.message}</p>
        `);
    });
});

app.listen(8090, '192.168.1.16', () => {
    console.log('Internal Portal running at http://YOUR_IP');
});

