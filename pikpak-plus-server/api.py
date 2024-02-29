import os
from gotrue.errors import AuthApiError
import functools
from supabase_client import supabase
from flask import Flask, request, jsonify, abort
from flask_cors import CORS
from pikpak import client as pik
from pikpak import shell_cmds as cmd
import logging, random, string
import apiscrape
import requests

app=Flask(__name__)
app.config['SECRET_KEY']=''.join(random.choice(string.ascii_uppercase + string.digits))

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
                # print(f"JWT: {jwt}")

                try:
                    supabase_user = supabase.auth.get_user(jwt)
                    # print("successfully got user")
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
    # print(json.dumps(client.get_user_info(), indent=4))

    return client

# Route to initialize the client
def initialize_client_route():
    global initialized_client

    # Obtain credential filename from request or use a default value
    cred_filename = request.args.get('cred_filename', 'client.json')

    # Initialize the client within the request context
    initialized_client = initialize_client(cred_filename)

    return jsonify({"result": "Client initialized successfully"})



@app.route('/help', methods=['GET'])
def help():
    res = cmd.cmds["help"](initialized_client, "param")
    return jsonify({"result": res})


def filter_tasks_by_supabase_ids(tasks, supabase_ids):
    matching_tasks = []
    task_ids = {task['id'] for task in tasks}
    supabase_id_set = {item['id'] for item in supabase_ids}
    common_ids = task_ids.intersection(supabase_id_set)

    for task in tasks:
        if task['id'] in common_ids:
            matching_tasks.append(task)
    return matching_tasks

def process_tasks_route(command_key, email):
    if initialized_client is None:
        abort(401, description="Client not initialized. Call initialize_client first.")

    # Execute the tasks command using initialized_client
    res = cmd.cmds[command_key](initialized_client, "param")
    supabase_res = supabase.table('user_actions').select('data').eq('email', email).eq('actions', 'create_task').execute()

    # Extracting supabase IDs from supabase response
    supabase_ids = [item['data'] for item in supabase_res.data]

    # Filtering tasks based on supabase IDs
    matching_tasks = filter_tasks_by_supabase_ids(res['tasks'], supabase_ids)
    res['tasks'] = matching_tasks
    return res

@app.route('/tasks', methods=['GET', 'POST'])
def get_tasks():
    data = request.get_json()
    email = data.get('email')
    print(email, "email")
    
    matching_tasks = process_tasks_route("tasks", email)

    # Assuming tasks command returns a dictionary, modify accordingly
    return jsonify(matching_tasks)

@app.route('/completedTasks', methods=['GET', 'POST'])
def get_tasks_completed():
    data = request.get_json()
    email = data.get('email')
    print(email, "email")
    
    matching_tasks = process_tasks_route("tasks_completed", email)

    # Assuming tasks command returns a dictionary, modify accordingly
    return jsonify(matching_tasks)

@app.route('/browse', methods=['POST'])
@user_route(enforce_login=True)
def browse(user):

    try:
        # Get JSON data from the request
        data = request.get_json()
        # print(data)
        item_index = data.get('item_index')

  
        # Call the ls command with initialized client and item_index
        res = cmd.cmds["ls"](initialized_client, "param", item_index)
        
        # Return the result as JSON
        return jsonify(res)

    except Exception as e:
        # Log error if an exception occurs
        logging.error("An error occurred during browse request: %s", str(e))
        return jsonify({"error": "An error occurred"}), 500


def create_supabase_task_action(user_email, action, data):

    if not user_email:
        return jsonify({"error": "user parameter is missing"}), 400
    
    try:
        res = supabase.table("user_actions").insert({"email": user_email,"actions": action, "data":data}).execute()
        return res
    except Exception as e:
        
        return jsonify({"error": str(e)}), 500


@app.route('/addURL', methods=['POST'])
@user_route(enforce_login=True)
def add_url(user):
    # Get the URL from the request data
    data = request.get_json()
    url = data.get('url')
    email = data.get('email')
    user_dir = data.get('user_dir')
    # print("crated with parent", user_dir)

    if not url:
        return jsonify({"error": "URL parameter is missing"}), 400

    try:
        # Execute the 'fetch' command with the initialized client
        res = cmd.cmds["fetch"](initialized_client, url,user_dir)
        create_supabase_task_action(email, "create_task", res['task'])
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
        # print('called 3')
        
        return jsonify({"error": str(e)}), 500


@app.route('/download', methods=['POST'])
@user_route(enforce_login=True)
def download(user):
    # Get the URL from the request data
    data = request.get_json()
    email = data.get('email')
    action = data.get('action')
    id = data.get('id')
    # print("id",id)
    if not id:
        return jsonify({"error": "URL parameter is missing"}), 400

    try:
        # Execute the 'fetch' command with the initialized client
        res = cmd.cmds["download"](initialized_client, "param",id)
        supabase.table("user_actions").insert({"email": email,"actions": action, "data":res}).execute()
        return jsonify(res)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/share', methods=['POST'])
def share():
    # Get the URL from the request data
    data = request.get_json()
    email = data.get('email')
    id = data.get('id')
    if not id:
        return jsonify({"error": "id parameter is missing"}), 400
    try:
        # Execute the 'fetch' command with the initialized client
        res = cmd.cmds["share"](initialized_client, id)
        supabase.table("user_actions").insert({"email": email,"actions": "share", "data":res}).execute()
        return jsonify(res)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/serverstats', methods=['GET'])
def serverstats():
    try:
        res = cmd.cmds["get_traffic_details"](initialized_client)
        res['base']['user_id'] = ''
        return jsonify(res['base'])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/getRedirectUrl', methods=['POST'])
def getRedirectUrl():
    data = request.get_json()
    url = data.get('url')
    try:
        res =  requests.get(url)
        return jsonify(res)
    except Exception as e:
        error_message = str(e)
        start_index = error_message.find("'")
        # Extract the substring after the single quotation marks
        remaining_string = error_message[start_index + 1:-1]
  
        return jsonify(str(remaining_string)), 200
        
# -------------------------------------------------------------------------------------------------------------



@app.get("/ping")
def pong():
    return "pong"
 
# @app.route("/api/getDirectoryId", methods=["GET", "POST"])
# def get_directory_id():
#     try:
#         req = request.get_json() 
#         email = req.get("email")
#         print(email, 'email')
    
#         response = supabase.table('pikpak_data').select('directory_id').eq('email', email).execute()
#         data = response.data
#         print('data', data)
#         if data:
#             directory_id = data[0]['directory_id']
#             return {'directory_id': directory_id}
#         else:
#             return {'error': 'directory not found'}
#     except Exception as e:
#         return {'error': str(e)}

def get_directory_id(email):
    try:
        response = supabase.table('pikpak_data').select('directory_id').eq('email', email).execute()
        data = response.data

        if data:
            directory_id = data[0]['directory_id']
            return {'directory_id': directory_id}
        else:
            return {'error': 'Email not found'}
    except Exception as e:
        return {'error': str(e)}

@app.route("/login", methods=["GET", "POST"])
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
                response = jsonify({'redirect': '/create',"dir":dir_id['directory_id'], "auth": data.session.access_token})                
                supabase.auth.sign_out()
                initialize_client_route()
                return response
            else:
                return jsonify({"error": "provide email and passowrd"}), 401
        except AuthApiError:
            return jsonify({"error": "auth failed"}), 401


@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        req = request.get_json()
        email = req.get("email")
        password = req.get("password")
        try:
            user = supabase.auth.sign_up(
                {"email": email, "password": password})
            # print(user)
            initialize_client_route()
            res = create_folder(email)
            # print(res, "res")
           
            return jsonify({'result': 'success signUp'}), 200
        except AuthApiError:
            return jsonify({"error": "signUp failed try again"}), 401

@app.route('/logout', methods=["GET", "POST"])
def logout():
    response = jsonify({'redirect': '/login'})
    # response.delete_cookie('auth')
    supabase.auth.sign_out()
    return response

# ---------- torrent api ----------------

@app.route('/searchFields', methods=['GET', 'POST'])
def searchFields():
    return apiscrape.indexerList()
   
@app.route('/search', methods=['GET', 'POST'])
def searchform():
    if request.method == "POST":
        req = request.get_json()
        query = req.get("query")    
        categoryList = req.get("categoryList")    
        indexerList = req.get("indexerList")    
        
        df = apiscrape.searchQuery(query, categoryList, indexerList)

        if df is not "Empty":
            json_data = df.to_json(orient='records')
            return json_data 
        return "No results found"

# ---------- torret api end -------------

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)