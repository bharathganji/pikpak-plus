"""
Supabase Setup Script for PikPak Plus
Checks connection and helps set up the required database schema.
"""
import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

def setup():
    print("🚀 PikPak Plus - Supabase Setup")
    print("-" * 30)

    # 1. Load Environment
    load_dotenv()
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")

    if not url or not key:
        print("❌ Error: Missing SUPABASE_URL or SUPABASE_KEY in .env")
        print("Please copy .env.example to .env and fill in your credentials.")
        sys.exit(1)

    # 2. Connect
    print(f"Connecting to: {url}")
    try:
        supabase: Client = create_client(url, key)
        print("✅ Connected to Supabase successfully!")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        sys.exit(1)

    # 3. Check Table
    print("\nChecking for 'public_actions' table...")
    try:
        # Try to select 1 row to see if table exists
        supabase.table("public_actions").select("id").limit(1).execute()
        print("✅ Table 'public_actions' already exists.")
        print("\nYou are all set! 🎉")
        
    except Exception as e:
        # If error contains "relation ... does not exist", table is missing
        if "does not exist" in str(e) or "404" in str(e):
            print("⚠️  Table 'public_actions' NOT found.")
            print("\n" + "="*50)
            print("ACTION REQUIRED: Run SQL Schema")
            print("="*50)
            print("Please go to your Supabase Dashboard -> SQL Editor")
            print("And run the following SQL command:\n")
            
            try:
                with open("supabase_schema.sql", "r") as f:
                    print(f.read())
            except FileNotFoundError:
                print("-- Error: supabase_schema.sql file not found --")
                
            print("\n" + "="*50)
        else:
            print(f"❌ Error checking table: {e}")

if __name__ == "__main__":
    setup()
