const fs = require('fs');
const path = require('path');
const net = require('net');
const express = require('express');
const mqtt = require('mqtt');
const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
// read .env
function loadEnv(envpath){
    const raw = fs.readFileSync(envpath,'utf-8');
    console.log('DEBUG [loadEnv]'+raw);
    return raw
        .split('\n')
        .filter(line=>line.trim() && !line.startsWith('#'))
        .map(line =>{
            const [serverid, serverip, serverport] = line.split(',').map(s=>s.trim());
            return {
                serverid,
                serverip,
                serverport,
            }
        });
}

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
                     lastChecked: null };
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
        const tasks = SERVICES.map(async (s)=>{
            //console.log('Debug [ updateServiceStatusLoop() ] now='+now+', s.lastChecked='+s.lastChecked);
            if(now-s.lastChecked >= s.interval * 1000){
                try{
                    s.online = await isHostUp(s.ip, s.port);
                }
                catch(err){
                    console.error('[error] ${s.name} cant check:',err.message);
                    s.online = false;
                }
                finally{
                    s.lastChecked = Date.now();
                }
            }
        });
        await Promise.allSettled(tasks);    
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

// 後端提供單一服務狀態查詢 API
app.get('/api/service/:name', (req, res)=>{
    const s = SERVICES.find(x=> x.name === req.params.name );
    if(!s) return res.status(404).json({error: 'Service not found'});
    res.json({
        name: s.name,
        ip: s.ip,
        port: s.port,
        online: s.online,
        lastChecked: s.lastChecked,
    });
});



const SERVERENV=loadEnv(path.join(__dirname,'.env'));
console.log(SERVERENV);
// 以 loadEnv載入環境變數，便於修改移轉主機:
app.listen(SERVERENV[0].serverport, SERVERENV[0].serverip, () => {
    console.log('Internal Portal '+SERVERENV[0].serverid+' running at http://'+SERVERENV[0].serverip+':'+SERVERENV[0].serverport);
});

