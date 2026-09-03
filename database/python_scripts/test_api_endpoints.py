import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

def test_api():
    login_url = "http://localhost:3001/api/auth/login"
    login_data = json.dumps({"username": "admin", "password": "123456"}).encode('utf-8')
    req = urllib.request.Request(login_url, data=login_data, headers={"Content-Type": "application/json", "Connection": "close"})
    
    with urllib.request.urlopen(req, timeout=5) as response:
        res = json.loads(response.read().decode('utf-8'))
        token = res.get("data", {}).get("accessToken") or res.get("accessToken")
        user = res.get("data", {}).get("user") or res.get("user")
        print(f"Logged in successfully! User: {user['fullName']}", flush=True)
        
    headers = {"Authorization": f"Bearer {token}", "Connection": "close"}
    
    endpoints = [
        ("Dashboard Overview", "http://localhost:3001/api/dashboard/overview"),
        ("Live Fleet", "http://localhost:3001/api/dashboard/live-fleet"),
        ("Vehicles List", "http://localhost:3001/api/vehicles"),
        ("Production Plans", "http://localhost:3001/api/production-plans"),
        ("Dispatch Orders", "http://localhost:3001/api/dispatch-orders"),
        ("Transport Orders", "http://localhost:3001/api/transport-orders"),
        ("Fuel Warehouses", "http://localhost:3001/api/fuel/warehouses"),
        ("Maintenance Records", "http://localhost:3001/api/maintenance/records"),
        ("Repairs List", "http://localhost:3001/api/repairs"),
        ("Driver KPI Leaderboard", "http://localhost:3001/api/driver-kpi/leaderboard-summary"),
        ("Catalogs List", "http://localhost:3001/api/catalogs")
    ]
    
    for name, url in endpoints:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            count = len(data.get("data", data)) if isinstance(data, (dict, list)) else 1
            print(f"✔ [{name}] -> OK (200) - Received data ({count} items)", flush=True)
            
    print("\nALL BACKEND API ENDPOINTS VERIFIED 100% OPERATIONAL!", flush=True)

if __name__ == "__main__":
    test_api()
