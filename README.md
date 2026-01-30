# 台灣公車動態查詢系統 (TDX Bus Info Proxy & Viewer)

這是一個基於 Python Flask 與 HTML/JS 的簡易公車查詢系統。它使用交通部 TDX (Transport Data eXchange) API 來抓取全台公車的即時動態與預估到站時間。

本專案包含一個後端代理伺服器 (Proxy)，用於處理 API 授權 (OAuth Token) 並解決跨來源資源共用 (CORS) 問題。

## 📁 檔案結構

* **`ptx_proxy.py`**: 後端程式。使用 Flask 架設本地伺服器，自動負責向 TDX 申請 Token 並轉發請求，避免前端直接暴露金鑰。

* **`businfo.html`**: 前端介面。提供使用者選擇縣市、輸入路線號碼的操作畫面。

* **`businfo.js`**: 前端邏輯。負責呼叫本地代理伺服器，並將回傳的 JSON 資料渲染成網頁上的到站資訊。

## 🚀 功能特色

* **自動化 Token 管理**: `ptx_proxy.py` 會自動處理 TDX 的 Client ID 與 Secret 認證，並在 Token 過期時自動換發。
* **CORS 解決方案**: 透過 Flask 的 `flask_cors` 套件，讓前端網頁可以順利讀取資料。
* **即時到站資訊**: 顯示公車路線的去程/返程站牌，以及每一站的預估到站時間（或末班車已過等狀態）。
* **支援多縣市**: 支援台北、新北、台中、台南、高雄等縣市查詢。

## 🛠️ 安裝與設定

### 1. 環境需求
請確保電腦已安裝 [Python 3](https://www.python.org/)。

### 2. 安裝必要套件
在終端機 (Terminal) 執行以下指令以安裝 Flask 與 Requests：

```bash
pip install flask flask-cors requests
