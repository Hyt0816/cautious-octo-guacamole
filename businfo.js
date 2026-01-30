// 使用 PTX 公車 API 查詢到站資訊
// 參考 https://ptx.transportdata.tw/MOTC/


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
        const stopsRes = await fetch(`https://ptx.transportdata.tw/MOTC/v2/Bus/DisplayStopOfRoute/City/${city}/${encodeURIComponent(route)}?format=JSON`);
        const stopsData = await stopsRes.json();
        if (!stopsData.length) throw new Error('查無此路線');
        stopsDataCache = stopsData;
        directionSelect.innerHTML = stopsData.map((d, i) => `<option value="${i}">${d.Direction === 0 ? '去程' : d.Direction === 1 ? '返程' : '其他'}：${d.Stops[0].StopName.Zh_tw} → ${d.Stops[d.Stops.length-1].StopName.Zh_tw}</option>`).join('');
    } catch (e) {
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
        // 查詢到站預估
        const estRes = await fetch(`https://ptx.transportdata.tw/MOTC/v2/Bus/EstimatedTimeOfArrival/City/${city}/${encodeURIComponent(route)}?format=JSON`);
        const estData = await estRes.json();
        // 整理資料
        let html = '';
        const stops = stopsDataCache[dirIdx].Stops;
        stops.forEach(stop => {
            const est = estData.find(e => e.StopUID === stop.StopUID && e.Direction == stopsDataCache[dirIdx].Direction);
            let status = '無資料';
            if (est) {
                if (est.StopStatus === 0) {
                    if (est.EstimateTime != null) {
                        const min = Math.floor(est.EstimateTime/60);
                        if (est.EstimateTime <= 180) {
                            status = `<span style='color:#d32f2f;font-weight:bold'>即將到站 (${min} 分鐘)</span>`;
                        } else {
                            status = min + ' 分鐘';
                        }
                    } else {
                        status = '進站中';
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
            html += `<div class="bus-item"><b>${stop.StopName.Zh_tw}</b>：${status}</div>`;
        });
        resultDiv.innerHTML = html;
    } catch (e) {
        resultDiv.innerHTML = `<div class="error">${e.message || '查詢失敗'}</div>`;
    }
                }