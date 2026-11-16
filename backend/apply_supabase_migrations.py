import os
import urllib.request
import json

from config import load_environment
load_environment()
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://cfmdqbedwjlkrittozxb.supabase.co")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")  # set in .env; never commit it

def check_connection():
    print("Checking Supabase connection...")
    try:
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/",
            headers={"apikey": SUPABASE_SERVICE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"}
        )
        res = urllib.request.urlopen(req)
        print("[OK] Supabase REST endpoint accessible. Status:", res.getcode())
    except Exception as e:
        print("[WARN] REST check:", str(e))

if __name__ == "__main__":
    check_connection()
