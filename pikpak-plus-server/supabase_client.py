import os
from flask import g
from werkzeug.local import LocalProxy
from supabase.client import Client, ClientOptions
from flask_storage import FlaskSessionStorage

url = os.getenv("SUPABASE_URL", "")
key = os.getenv("SUPABASE_KEY", "")


def get_supabase() -> Client:
    if "supabase" not in g:
        g.supabase = Client(
            url,
            key,
        )
    return g.supabase

supabase: Client = LocalProxy(get_supabase)
