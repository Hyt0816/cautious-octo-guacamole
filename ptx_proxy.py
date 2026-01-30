import requests
from flask import Flask, request, Response, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ==========================================
# 請在這裡填入你在 TDX 申請的 Key
# ==========================================
CLIENT_ID = '112703023-2e10c60c-1991-4015'
CLIENT_SECRET = '9997e5ab-8d0f-4247-9f60-3839fbd38693'

# 用來暫存 Token 的變數，避免每次都重新申請
access_token = None

def get_auth_token():
    """向 TDX 取得授權 Token"""
    auth_url = "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token"
    data = {
        'grant_type': 'client_credentials',
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET
    }
    
    try:
        response = requests.post(auth_url, data=data)
        response.raise_for_status()
        token_info = response.json()
        return token_info.get('access_token')
    except Exception as e:
        print(f"取得 Token 失敗: {e}")
        return None

@app.route('/ptx/<path:api_path>')
def proxy(api_path):
    global access_token
    
    # 1. 確保有 Token (如果沒有，就去申請一個)
    if not access_token:
        access_token = get_auth_token()
        if not access_token:
            return jsonify({"error": "無法取得授權 Token，請檢查 Client ID/Secret"}), 500

    # 2. 組合新的 TDX API 網址 (注意：這裡是 api/basic/v2)
    # 使用者傳進來的 api_path 例如：Bus/Route/City/Taipei
    # 這是最乾淨的寫法，讓 Python 只負責轉送，路徑由瀏覽器決定
    target_url = f'https://tdx.transportdata.tw/api/basic/v2/{api_path}'
    
    # 3. 將原本網址後的參數 (?$filter=...) 也帶過去
    params = request.args.to_dict()
    
    # 4. 設定 Header，將 Token 帶入
    headers = {
        "authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    try:
        # 5. 發送請求給 TDX
        resp = requests.get(target_url, params=params, headers=headers)
        
        # 如果 Token 過期 (401)，嘗試重新取得一次 Token 再試一次
        if resp.status_code == 401:
            print("Token 可能過期，重新取得中...")
            access_token = get_auth_token()
            headers["authorization"] = f"Bearer {access_token}"
            resp = requests.get(target_url, params=params, headers=headers)

        # 6. 回傳結果給前端
        return Response(resp.content, status=resp.status_code, content_type=resp.headers.get('content-type'))
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
if __name__ == '__main__':
    app.run(port=5000, debug=True)