import requests
try:
    resp = requests.get("http://localhost:11434/api/tags", timeout=2)
    print(resp.json())
except Exception as e:
    print(e)
