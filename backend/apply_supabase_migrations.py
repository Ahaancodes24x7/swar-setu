import os
import urllib.request
import json

SUPABASE_URL = "https://cfmdqbedwjlkrittozxb.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmbWRxYmVkd2psa3JpdHRvenhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDcwNTc1OCwiZXhwIjoyMTAwMjgxNzU4fQ.x41HryVw9AoGBfKDuaz62-6whbqtsPgr45IJW7URQhs"

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
