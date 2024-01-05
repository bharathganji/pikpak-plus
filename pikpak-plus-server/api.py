import json
import os
from gotrue.errors import AuthApiError
import functools
from flask import session
from supabase_client import supabase
from flask import Flask, request, jsonify, abort
from flask_cors import CORS
from pikpak import client as pik
from pikpak import shell_cmds as cmd
import logging


app = Flask(__name__)
app.secret_key = "super secret key"

CORS(app)

# Global variable to store the initialized client
initialized_client = None


def user_route(enforce_login=False):
    def decorator(route):
        @functools.wraps(route)
        def route_wrapper(*args, **kwargs):
            jwt = request.headers.get('Authorization') or ''
            # print(jwt)
            if enforce_login and not jwt:
                return jsonify({"error": "token is missing"}), 401
            supabase_user = None
            if jwt and jwt.startswith('Bearer '):
                jwt = jwt.replace('Bearer ', '')
                print(f"JWT: {jwt}")

                try:
                    supabase_user = supabase.auth.get_user(jwt)
                    print("successfully got user")
                except Exception as e:
                    
                    return jsonify({"error": "signIn failed"}), 401
            user = supabase_user.user if supabase_user else None
            return route(user, *args, **kwargs)
        return route_wrapper
    return decorator


# Common function to initialize client and configuration
def initialize_client(cred_filename):
  # Initialize client and configuration

    client, conf = pik.client_from_credit(cred_filename, proxy=None)
    if not client:
        # Provide default values for user, password, and proxy
        user = os.getenv("user", "default_user")
        passwd = os.getenv("passwd", "default_password")
        proxy = os.getenv("proxy", "")
        
        client, conf = pik.client_from_password(user, passwd, cred_filename, proxy)
        
    # Check if the client is successfully initialized
    if not client:
        return jsonify({"error": "Invalid login credentials"}), 401

    # Print user information
    print(json.dumps(client.get_user_info(), indent=4))

    return client

# Route to initialize the client
def initialize_client_route():
    global initialized_client

    # Obtain credential filename from request or use a default value
    cred_filename = request.args.get('cred_filename', 'client.json')

    # Initialize the client within the request context
    initialized_client = initialize_client(cred_filename)

    return jsonify({"result": "Client initialized successfully"})


def get_directory_id(email):
    try:
        # Fetch data from the 'pikpak_data' table based on the email
        response = supabase.table('pikpak_data').select('directory_id').eq('email', email).execute()
        print(10000)
        data = response.data

        # Check if the email is found
        if data:
            print(20000)
            
            directory_id = data[0]['directory_id']
            return {'directory_id': directory_id}
        else:
            print(30000)
            
            return {'error': 'Email not found'}

    except Exception as e:
        return {'error': str(e)}

@app.route('/api/help', methods=['GET'])
def help():
    # global initialized_client

    # if initialized_client is None:
    #     abort(401, description="Client not initialized. Call initialize_client first.")

    # Execute the help command using initialized_client
    res = cmd.cmds["help"](initialized_client, "param")
    return jsonify({"result": res})

@app.route('/api/tasks', methods=['GET'])
# @user_route(enforce_login=True)
def get_tasks():
    global initialized_client

    if initialized_client is None:
        abort(401, description="Client not initialized. Call initialize_client first.")

    # Execute the tasks command using initialized_client
    res = cmd.cmds["tasks"](initialized_client, "param")

    # Assuming tasks command returns a dictionary, modify accordingly
    return jsonify(res)

@app.route('/api/browse', methods=['POST'])
@user_route(enforce_login=True)
def browse(user):
    # global initialized_client

    # Check if the client is initialized
    # if initialized_client is None:
    #     print(40000)
    #     abort(401, description="Client not initialized. Call initialize_client first.")
    
    try:
        print(50000)
        
        # Get JSON data from the request
        data = request.get_json()
        print(data)
        item_index = data.get('item_index')

  
        # Call the ls command with initialized client and item_index
        res = cmd.cmds["ls"](initialized_client, "param", item_index)
        
        # Return the result as JSON
        return jsonify(res)

    except Exception as e:
        # Log error if an exception occurs
        logging.error("An error occurred during browse request: %s", str(e))
        return jsonify({"error": "An error occurred"}), 500

@app.route('/api/addURL', methods=['POST'])
@user_route(enforce_login=True)
def add_url(user):
    # Get the URL from the request data
    data = request.get_json()
    url = data.get('url')
    user_dir = data.get('user_dir')
    print("crated with parent", user_dir)

    if not url:
        return jsonify({"error": "URL parameter is missing"}), 400

    try:
        # Execute the 'fetch' command with the initialized client
        res = cmd.cmds["fetch"](initialized_client, url,user_dir)
        print(res)
        return jsonify({"result": res})
    except Exception as e:
        initialize_client_route()
        return jsonify({"error": str(e)}), 500

def get_username_from_email(email):
    # Split the email address at the "@" symbol
    username, _ = email.split('@', 1)

    return username

# @app.route('/api/createFolder', methods=['POST'])
# @user_route(enforce_login=True)
def create_folder(user_email):
    
    # Get the URL from the request data
    # data = request.get_json()
    # user_dir = data.get('user_dir')
    if not user_email:
        return jsonify({"error": "user parameter is missing"}), 400
    
    user_dir = get_username_from_email(user_email)
    if not user_dir:
        return jsonify({"error": "user_dir parameter is missing"}), 400
    try:
        # Execute the 'fetch' command with the initialized client
        res = cmd.cmds["create_folder"](initialized_client, user_dir)
                
        file_id = res["id"]

        supabase.table("pikpak_data").insert({"email": user_email,"directory_id": file_id}).execute()

        return res
    except Exception as e:
        print('called 3')
        
        return jsonify({"error": str(e)}), 500


@app.route('/api/download', methods=['POST'])
@user_route(enforce_login=True)
def download(user):
    # Get the URL from the request data
    data = request.get_json()
    id = data.get('id')
    print("id",id)
    if not id:
        return jsonify({"error": "URL parameter is missing"}), 400

    try:
        # Execute the 'fetch' command with the initialized client
        res = cmd.cmds["download"](initialized_client, "param",id)
        return jsonify(res)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
# -------------------------------------------------------------------------------------------------------------



@app.get("/api/ping")
def pong():
    return "pong"


@app.route("/api/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        data = None
        req = request.get_json() 
        email = req.get("email")
        password = req.get("password") 
        
        try:
            if email and password:
                data = supabase.auth.sign_in_with_password({'email': email, 'password': password})
                dir_id = get_directory_id(email)
                print(dir_id)
                response = jsonify({'redirect': '/create',"dir":dir_id['directory_id'], "auth": data.session.access_token})
                supabase.auth.sign_out()
                print(1111111111111)
                initialize_client_route()
                
                print(222222222222222)
                return response
            else:
                print(333333333333)
                return jsonify({"error": "provide email and passowrd"}), 401
        except AuthApiError:
            print(44444444444)
            return jsonify({"error": "auth failed"}), 401


@app.route("/api/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        req = request.get_json()
        email = req.get("email")
        password = req.get("password")
        try:
            user = supabase.auth.sign_up(
                {"email": email, "password": password})
            print(user)
            initialize_client_route()
            res = create_folder(email)
            print(res, "res")
           
            return jsonify({'result': 'success signUp'}), 200
        except AuthApiError:
            return jsonify({"error": "signUp failed try again"}), 401

@app.route('/api/logout', methods=["GET", "POST"])
def logout():
    response = jsonify({'redirect': '/login'})
    # response.delete_cookie('auth')
    supabase.auth.sign_out()
    return response


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)