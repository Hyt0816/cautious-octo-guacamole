// businfo.js - 修正版
// 這裡我們改用 "本地代理伺服器" 來抓資料，而不是直接連去 TDX

const cityMap = {
    Taipei: 'Taipei',
    NewTaipei: 'NewTaipei',
    Taichung: 'Taichung',
    Tainan: 'Tainan',
    Kaohsiung: 'Kaohsiung',
};

const directionSelect = document.getElementById('direction');
const searchBtn = document.getElementById('search');
const routeInput = document.getElementById('route');
let stopsDataCache = [];

routeInput.addEventListener('change', handleRouteInput);
routeInput.addEventListener('blur', handleRouteInput);

async function handleRouteInput() {
    await loadDirections();
    showAllStops();
}

function showAllStops() {
    const resultDiv = document.getElementById('result');
    if (!stopsDataCache.length) {
        resultDiv.innerHTML = '';
        return;
    }
    let html = '';
    stopsDataCache.forEach((dir, idx) => {
        html += `<div style='margin:8px 0 4px;font-weight:bold;color:#1976d2;'>${dir.Direction === 0 ? '去程' : dir.Direction === 1 ? '返程' : '其他'}：${dir.Stops[0].StopName.Zh_tw} → ${dir.Stops[dir.Stops.length-1].StopName.Zh_tw}</div>`;
        html += dir.Stops.map(stop => `<span class='bus-item' style='display:inline-block;margin:2px 4px 2px 0;padding:4px 8px;'>${stop.StopName.Zh_tw}</span>`).join('');
    });
    resultDiv.innerHTML = html;
}

async function loadDirections() {
    const city = document.getElementById('city').value;
    const route = routeInput.value.trim();
    directionSelect.innerHTML = '<option value="">查詢中...</option>';
    if (!route) {
        directionSelect.innerHTML = '<option value="">請先查詢路線</option>';
        return;
    }
    try {
        // [修正重點 1]：網址改為連線到本地 Python Server (127.0.0.1:5000/ptx/...)
        const url = `http://127.0.0.1:5000/ptx/Bus/DisplayStopOfRoute/City/${city}/${encodeURIComponent(route)}`;
        
        const stopsRes = await fetch(url);
        const stopsData = await stopsRes.json();
        
        // 錯誤處理：如果後端回傳錯誤訊息
        if (stopsData.error) throw new Error(stopsData.error);
        if (!stopsData.length) throw new Error('查無此路線');
        
        stopsDataCache = stopsData;
        directionSelect.innerHTML = stopsData.map((d, i) => `<option value="${i}">${d.Direction === 0 ? '去程' : d.Direction === 1 ? '返程' : '其他'}：${d.Stops[0].StopName.Zh_tw} → ${d.Stops[d.Stops.length-1].StopName.Zh_tw}</option>`).join('');
    } catch (e) {
        console.error(e);
        directionSelect.innerHTML = `<option value="">${e.message || '查詢失敗'}</option>`;
    }
}

searchBtn.onclick = async function() {
    const city = document.getElementById('city').value;
    const route = routeInput.value.trim();
    const resultDiv = document.getElementById('result');
    const dirIdx = parseInt(directionSelect.value, 10);
    resultDiv.innerHTML = '';
    
    if (!route) {
        resultDiv.innerHTML = '<div class="error">請輸入公車號碼</div>';
        return;
    }
    if (!stopsDataCache.length || isNaN(dirIdx) || dirIdx < 0 || dirIdx >= stopsDataCache.length) {
        resultDiv.innerHTML = '<div class="error">請先查詢並選擇方向</div>';
        return;
    }
    
    resultDiv.textContent = '查詢中...';
    try {
        // [修正重點 2]：網址改為連線到本地 Python Server
        const url = `http://127.0.0.1:5000/ptx/Bus/EstimatedTimeOfArrival/City/${city}/${encodeURIComponent(route)}`;

        const estRes = await fetch(url);
        const estData = await estRes.json();

        if (estData.error) throw new Error(estData.error);

        // 整理資料
        let html = '';
        const stops = stopsDataCache[dirIdx].Stops;
        stops.forEach(stop => {
            // 比對到站資料
            const est = estData.find(e => e.StopUID === stop.StopUID && e.Direction == stopsDataCache[dirIdx].Direction);
            let status = '無資料';
            let statusColor = '#666';

            if (est) {
                if (est.StopStatus === 0) { // 正常營運
                    if (est.EstimateTime != null) {
                        const min = Math.floor(est.EstimateTime/60);
                        if (est.EstimateTime <= 60) {
                            status = `<b>即將進站</b>`;
                            statusColor = 'red';
                        } else if (est.EstimateTime <= 180) {
                            status = `<b>約 ${min} 分</b>`;
                            statusColor = '#d32f2f';
                        } else {
                            status = `${min} 分`;
                            statusColor = 'black';
                        }
                    } else {
                        status = '進站中';
                        statusColor = 'red';
                    }
                } else if (est.StopStatus === 1) {
                    status = '尚未發車';
                } else if (est.StopStatus === 2) {
                    status = '交管不停靠';
                } else if (est.StopStatus === 3) {
                    status = '末班車已過';
                } else if (est.StopStatus === 4) {
                    status = '今日未營運';
                }
            }
            html += `<div class="bus-item">
                        <span style="display:inline-block; width:180px;">${stop.StopName.Zh_tw}</span>
                        <span style="color:${statusColor}">${status}</span>
                     </div>`;
        });
        resultDiv.innerHTML = html;
    } catch (e) {
        console.error(e);
        resultDiv.innerHTML = `<div class="error">${e.message || '查詢失敗'}</div>`;
    }
}