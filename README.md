# Internal Portal

一個基於 Node.js 與 EJS 模板引擎，提供內部家庭網路設備入口頁的輕量專案。
能夠動態顯示設備是否在線，並提供快速管理連結。

## 1. 專案目標

* 提供單一入口頁集中管理家庭內部設備（如音響系統、音樂伺服器等）

* 顯示設備是否在線

* 點選即可跳轉至設備的管理頁

* 站台資料外部化，方便增減維護

## 2. 技術架構
### 2.1 技術選型
* Node.js
* Express 框架
* EJS 模板引擎
* 純 CSS 無框架樣式

### 2.2 核心功能
* 使用 TCP socket 嘗試連線設備確認狀態
* 根據設備狀態（在線 / 離線）動態產生頁面
* 提供靜態 CSS 檔案服務
* 站台清單以外部檔案 servers.list 管理


### 2.3 環境設定
* 選擇以安裝系統層級的 nodejs為主, 
* 若以使用者層級的方式安裝 nvm控管 nodejs, 雖然方便但是在管理此專案服務時不夠乾淨, 

#### 建置步驟, 此處以 raspberry pi os舉例:
- 下載套件:
```bash
    https://nodejs.org/zh-tw/download 
    
    下方找到 "或者取得適用於 **Linux** **ARM64**平台的 Node.js® 組建。"
    
    下載 v22.17.1 linux arm64的獨立安裝包:

    https://nodejs.org/dist/v22.17.1/node-v22.17.1-linux-arm64.tar.xz
```
- 以 sudo 解壓縮此安裝包, 會呈現以下結構:
```bash
    ├── bin/
    ├── CHANGELOG.md
    ├── include/
    ├── lib/
    ├── LICENSE
    ├── README.md
    └── share/
```

- 把 bin/, include/, lib/, share/ 四個資料夾 cp -r到 /usr/local/
```bash
    cp -r bin /usr/local/
    cp -r include /usr/local/
    cp -r lib /usr/local/
    cp -r share /usr/local/
```
- 檢查版本與執行位置
```bash
    node -v
    npm -v

    which node
    which npm
```

## 3. 檔案結構說明
```bash
Internal-Portal/
├── app.js            Node.js 主程式, 限定指定設定通訊介面的 ip, 通訊埠號預設8080.
├── package.json      套件定義
├── servers.list      站台清單（外部設定檔）, 檔案權限設定為 660, 並且最好設定為 root:adm, 並且把目前使用者加入 adm群組.
├── public/
│   └── style.css     自定義樣式
├── views/
|    └── index.ejs    EJS 模板檔案
└── start.sh          服務啟動腳本 
```

## 4. servers.list 格式說明
每行一筆設備，格式如下（以逗號分隔）：
```bash
名稱,IP,Port,對應網址

ps: 其中網址可以包含要傳入的帳號密碼，所以此檔案需有權限保護，以利安全.
```

範例：
```bash
Lyric LMS,192.168.1.11,9000,http://192.168.1.11:9000
PiCorePlayer,192.168.1.10,80,http://192.168.1.10

```

## 5. 執行步驟
### 5.1 npm安裝依賴
```bash
npm install
```

### 5.2 手動啟動服務
```bash
sudo node app.js
```

也可用啟動腳本手動啟動:
```bash
./start.sh
```

服務將會綁定於內部網路指定的 IP：
```bash
例如:
http://192.168.1.xxx
```

### 5.3 以 systemd服務安裝:

#### 1. 先將此專案放置於適合的系統目錄
例如: /opt/ or /usr/local/
此處以 /opt/為範例:

#### 2. 編輯 internal-portal.service, 
找到 ExecStart= 這行將服務命令腳本位址設定上去, 最後記得加上 & 放到背景執行,
而 ExecStop= 這行指令可以去辨認這個命令腳本的執行緒在服務中止時 pkill掉.

```bash
[Unit]
Description=Internal Portal Dockerized Node service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple

ExecStart=/opt/internal-portal/start.sh &  
ExecStop=pkill start.sh

WorkingDirectory=/opt/internal-portal
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target

```



#### 3. 以 systemctl查詢服務狀態:
```bash

$ systemctl status internal-portal.service

● internal-portal.service - Internal Portal Dockerized Node service
     Loaded: loaded (/etc/systemd/system/internal-portal.service; enabled; preset: enabled)
     Active: active (running) since Thu 2025-07-24 11:32:10 CST; 12min ago
   Main PID: 56836 (bash)
      Tasks: 12 (limit: 8750)
        CPU: 1.246s
     CGroup: /system.slice/internal-portal.service
             ├─56836 bash /opt/internal-portal/start.sh "&"
             └─56837 node app.js

Jul 24 11:32:10 raspberrypi4 systemd[1]: Started internal-portal.service - Internal Portal Dockerized Node service.
Jul 24 11:32:10 raspberrypi4 start.sh[56837]: Internal Portal running at http://192.168.1.xxx

```


## 6. 系統架構邏輯

### 6.1 核心流程
    1. 讀取 servers.list 檔案，解析每一筆站台資訊
    2. 使用 TCP 檢測該 IP:PORT 是否可連線，確認是否在線
    3. 動態渲染 EJS 模板，依據狀態呈現按鈕與標示
    4. 提供單一入口頁供使用者統一管理跳轉

### 6.2 狀態顯示規則
| 狀態 | 顯示文字    | 顏色   | 操作按鈕     |
| -- | ------- | ---- | -------- |
| 在線 | Online  | 綠色字樣 | 可點擊，導向設備 |
| 離線 | Offline | 紅色字樣 | 灰色不可點擊   |

## 7. 後續擴充建議
* 將 servers.list 換為 JSON / YAML 結構更佳
* 支援設備分類顯示（如音響 / NAS / 其他區網內服務）
* 改用 WebSocket 定期自動刷新狀態
* 美化 UI，增加登入驗證等安全性

--- 
## 8. 🔧 新版技術改進重點

### 8.1 🌐 支援非同步/多執行序設備掃描

* 改以非同步 Promise.allsettled 併發掃描設備狀態統一收合，大幅減少渲染延遲。

* 單次掃描耗時由數秒縮短。

* 後端提供單一服務狀態查詢 API `/api/service/:name`
```js
app.get('/api/service/:name', (req, res) => {
    const s = SERVICES.find(x => x.name === req.params.name);
    if (!s) return res.status(404).json({ error: 'Service not found' });

    res.json({
        name: s.name,
        ip: s.ip,
        port: s.port,
        online: s.online,
        lastChecked: s.lastChecked,
    });
});

```

### 8.2 ✅ 增加連線穩定判斷細節

* 明確設定 TCP socket.setTimeout(1000)，避免 hang 住。

* 明確區分 connect 成功與 connect timeout / error。

### 8.3 🧱 前端顯示層邏輯強化
* EJS 初版畫面建構

    使用 EJS 模板渲染出服務狀態表格

    每列顯示服務名稱、狀態、檢查時間、管理連結


* 前端定義每個服務 <tr> 唯一標識

    給每個服務列 <tr id="service-服務名稱">

    加上 .status、.last-checked 等子元素 class，便於更新

* 加入前端 JS 動態更新

    自動每秒輪詢每個服務 /api/service/:name 狀態

    若有變化，只更新對應那一列 <tr> 的內容（非整頁刷新）

    顯示幾秒前更新，使用 lastChecked 計算時間差

* 前端範本 views/index.ejs :
```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <title>Internal Portal</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <h1>Internal Portal</h1>
    <table>
        <thead>
            <tr>
                <th>服務</th>
                <th>狀態</th>
                <th>上次檢查</th>
                <th>管理</th>
            </tr>
        </thead>
        <tbody>
        <% services.forEach(function(s) { %>
            <tr id="service-<%= s.name %>" class="service-row">
                <td><%= s.name %></td>
                <td>
                    <span class="status">
                    <% if (s.online) { %>
                        <span class="status-online">🟢 Online</span>
                    <% } else { %>
                        <span class="status-offline">🔴 Offline</span>
                    <% } %>
                    </span>
                </td>
                <td class="last-checked">
                    <% if(s.lastChecked === null){ %>
                        尚未檢查
                    <% } else { %>
                        <%= Math.round((Date.now()-s.lastChecked)/1000) %> 秒前
                    <% } %>
                </td>
                <td>
                    <% if (s.online && s.url.startsWith('/check/')) { %>
                        <a href="<%= s.url %>" class="button button-online">測試</a>
                    <% } else if (s.online && s.url !== '-') { %>
                        <a href="<%= s.url %>" target="_blank" class="button button-online">前往</a>
                    <% } else if (s.url === '-') { %>
                        <span style="color:gray">無管理頁面</span>
                    <% } else { %>
                        <button class="button button-offline" disabled>無法連線</button>
                    <% } %>
                </td>
            </tr>
        <% }); %>
        </tbody>
    </table>

    <!-- Step 3: 動態更新腳本區塊 -->
    <script>
        const serviceNames = <%- JSON.stringify(services.map(s => s.name)) %>;

        function updateService(name) {
            fetch(`/api/service/${name}`)
                .then(res => res.json())
                .then(data => {
                    const row = document.getElementById(`service-${data.name}`);
                    if (!row) return;

                    const statusTd = row.querySelector('.status');
                    const lastCheckedTd = row.querySelector('.last-checked');

                    // 狀態圖示（Online/Offline）
                    statusTd.innerHTML = data.online
                        ? '<span class="status-online">🟢 Online</span>'
                        : '<span class="status-offline">🔴 Offline</span>';

                    // 秒數顯示
                    if (data.lastChecked) {
                        const secondsAgo = Math.round((Date.now() - data.lastChecked) / 1000);
                        lastCheckedTd.textContent = `${secondsAgo} 秒前`;
                    } else {
                        lastCheckedTd.textContent = '尚未檢查';
                    }
                })
                .catch(err => console.error('更新失敗:', name, err));
        }

        // 每 1 秒刷新一次所有服務（之後可自訂每項頻率）
        setInterval(() => {
            serviceNames.forEach(updateService);
        }, 1000);
    </script>
</body>
</html>


```
--- 
## Milestone table
| 階段 | 項目                | 描述                          | 狀態        |
| -- | ----------------- | --------------------------- | --------- |
| M1 | 基礎 Node/EJS 搭建    | 完成基本入口頁架構與 EJS 模板渲染         | ✅ 已完成     |
| M2 | TCP 掃描功能          | 加入設備狀態判斷（socket 連線檢查）       | ✅ 已完成     |
| M3 | 設備外部設定管理          | 引入 `servers.list` 外部檔案解析    | ✅ 已完成     |
| M4 | CSS 樣式與 UI 顯示邏輯   | 線上／離線顏色與按鈕狀態區別              | ✅ 已完成     |
| M5 | 啟動腳本與 systemd 整合  | `start.sh` 腳本與 `systemd` 配置 | ✅ 已完成     |
| M6 | ⚡ 效能最佳化           | 引入 async 扫描、非同步 socket 處理   | ✅ 本次核心更新  |
| M7 | 💡 開發者偵錯機制        | 加入掃描耗時記錄、個別失敗提示             | ✅ 本次核心更新  |
| M8 | 🧩 可維護性提升         | 程式結構整理，方便未來分類擴充             | ✅ 已納入設計考量 |
| M9 | 📝 README 整理與技術文檔 | 撰寫本篇說明，更新至此里程碑              | ✅ 此項      |

