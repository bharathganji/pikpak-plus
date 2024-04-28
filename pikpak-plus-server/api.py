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
from datetime import datetime


app=Flask(__name__)
app.config['SECRET_KEY']=''.join(random.choice(string.ascii_uppercase + string.digits))
initialized_clients = {}

usernames_str = os.getenv("user", "")
usernamesArray = [email.strip() for email in usernames_str.split(",")] if usernames_str else []

CORS(app)


DELETE_OR_TRASH = os.getenv("DELETE_OR_TRASH", "trash")

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

def initialize_client_route(server_number):
    global initialized_clients

    try:
        # Obtain credential filename from request or use a default value
        cred_filename = f'PP-server#{server_number}.json'
        print(initialized_clients,"initialized_clients")

        # Initialize the client within the request context
        initialized_client = initialize_client(cred_filename, server_number)
        initialized_clients[server_number] = initialized_client
        
        
        return jsonify({"result": f"Client for PP-server#{server_number} initialized successfully"})

    except Exception as e:
        print(f"Error initializing client for PP-server#{server_number}: {e}")
        return jsonify({"error": str(e)}), 500

def initialize_client(cred_filename, server_number):
    try:
        users= usernamesArray
        
        passwords_str = os.getenv("passwd", "")
        passwords = [password.strip() for password in passwords_str.split(",")] if passwords_str else []
        
        user_index = int(server_number) - 1
        print("user_index: ", user_index)
        print("users length: ", len(users))
        if user_index < 0 or user_index >= len(users):
            raise ValueError("Invalid server number")

        user = users[user_index]
        password = passwords[user_index] if user_index < len(passwords) else "default_password"  # Fetch password based on index

        client, conf = pik.client_from_credit(cred_filename, proxy=None)
        if not client:
            # Provide default value for proxy
            proxy = os.getenv("proxy", "")
            
            client, conf = pik.client_from_password(user, password, cred_filename, proxy)
            
        # Check if the client is successfully initialized
        if not client:
            raise ValueError("Invalid login credentials")

        return client

    except Exception as e:
        print(f"Error initializing client for PP-server#{server_number}: {e}")
        return jsonify({"error": str(e)}), 500


def filter_tasks_by_supabase_ids(tasks, supabase_ids):
    matching_tasks = []
    task_ids = {task['id'] for task in tasks}
    supabase_id_set = {item['id'] for item in supabase_ids}
    common_ids = task_ids.intersection(supabase_id_set)

    for task in tasks:
        if task['id'] in common_ids:
            matching_tasks.append(task)
    return matching_tasks

def process_tasks_route(command_key, email, server_number):
    if initialized_clients.get(server_number) is None:
        abort(401, description="Client not initialized. Call initialize_client first.")

    # Execute the tasks command using initialized_client
    res = cmd.cmds[command_key](initialized_clients.get(server_number), "param")
    supabase_res = supabase.table('user_actions').select('data').eq('email', email).eq('actions', 'create_task').execute()

    # Extracting supabase IDs from supabase response
    supabase_ids = [item['data'] for item in supabase_res.data]

    # Filtering tasks based on supabase IDs
    matching_tasks = filter_tasks_by_supabase_ids(res['tasks'], supabase_ids)
    res['tasks'] = matching_tasks
    return res

@app.route('/tasks', methods=['POST'])
def get_tasks():
    data = request.get_json()
    email = data.get('email')
    print(email, "email")

    server_number = data.get('server_number')
    matching_tasks = process_tasks_route("tasks", email, server_number)

    # Assuming tasks command returns a dictionary, modify accordingly
    return jsonify(matching_tasks)

@app.route('/completedTasks', methods=['POST'])
def get_tasks_completed():
    data = request.get_json()
    email = data.get('email')
    server_number = data.get('server_number')
   
    matching_tasks = process_tasks_route("tasks_completed", email,server_number)

    # Assuming tasks command returns a dictionary, modify accordingly
    return jsonify(matching_tasks)

@app.route('/browse', methods=['POST'])
@user_route(enforce_login=True)
def browse(user):

    try:
        # Get JSON data from the request
        data = request.get_json()
        item_index = data.get('item_index')
        server_number = data.get('server_number')

  
        # Call the ls command with initialized client and item_index
        res = cmd.cmds["ls"](initialized_clients.get(server_number), "param", item_index)
        
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
    server_number = data.get('server_number')

    if not url:
        return jsonify({"error": "URL parameter is missing"}), 400

    try:
        # Execute the 'fetch' command with the initialized client
        res = cmd.cmds["fetch"](initialized_clients.get(server_number), url,user_dir)
        create_supabase_task_action(email, "create_task", res['task'])
        return jsonify({"result": res})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def get_username_from_email(email):
    # Split the email address at the "@" symbol
    username, _ = email.split('@', 1)

    return username

def create_folder(user_email):
    
    if not user_email:
        return jsonify({"error": "user parameter is missing"}), 400
    try:
        print("email ", user_email)

        # Define a dictionary to store server information
        server_info = {}

        for server_number in range(0, len(usernamesArray)):
            if usernamesArray[server_number] == "":
                continue
            server_number=server_number+1
            res = check_for_duplicate_file_name(user_email, server_number)
            file_id = res["id"]
            # Create a dictionary to represent the server information
            server_id = f"PP-server#{server_number}"
            server_info[server_id] = {
                "directory_id": file_id,
                "date": datetime.now().isoformat()  # Get the current date and time
            }
        # Insert server_info into the 'server_info' column of the 'pikpak_data' table
        supabase.table("pikpak_data").insert({"email": user_email, "server_info": server_info}).execute()

        return True
    except Exception as e:
        print('error in create folder',e)
        return jsonify({"error": str(e)}), 500


@app.route('/download', methods=['POST'])
@user_route(enforce_login=True)
def download(user):
    # Get the URL from the request data
    data = request.get_json()
    email = data.get('email')
    action = data.get('action')
    id = data.get('id')
    server_number = data.get('server_number')

    if not id:
        return jsonify({"error": "URL parameter is missing"}), 400

    try:
        # Execute the 'fetch' command with the initialized client
        res = cmd.cmds["download"](initialized_clients.get(server_number), "param",id)
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
    server_number = data.get('server_number')

    if not id:
        return jsonify({"error": "id parameter is missing"}), 400
    try:
        # Execute the 'fetch' command with the initialized client
        res = cmd.cmds["share"](initialized_clients.get(server_number), id)
        supabase.table("user_actions").insert({"email": email,"actions": "share", "data":res}).execute()
        return jsonify(res)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/serverstats', methods=['POST'])
def serverstats():
    try:
        data = request.get_json()
        server_number = data.get('server_number')
        res = cmd.cmds["get_traffic_details"](initialized_clients.get(server_number))
        res['base']['user_id'] = ''
        return jsonify(res['base'])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/drivestats', methods=['POST'])
def drivestats():
    data = request.get_json()
    server_number = data.get('server_number')
    try:
        res = cmd.cmds["get_about_details"](initialized_clients.get(server_number))
        return jsonify(res)
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
  
@app.route('/delete', methods=['POST'])
@user_route(enforce_login=True)
def delete(user):
    data = request.get_json()
    email = data.get('email')
    id = data.get('id')
    server_number = data.get('server_number')

    DELETE_OR_TRASH_local = DELETE_OR_TRASH.lower()
    try:
        if DELETE_OR_TRASH_local == 'delete':
            res = cmd.cmds["delete"](initialized_clients.get(server_number), id)
            supabase.table("user_actions").insert({"email": email,"actions": "delete", "data":id}).execute()
        else:
            res = cmd.cmds["trash"](initialized_clients.get(server_number), id)
        return jsonify(res)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
  
def check_error(response):
    # Parse the error response
    error_response = response.json()
    
    # Check if the error message and error code match the expected conditions
    if ("error" in error_response and error_response["error"] == "file_duplicated_name" and
        "error_code" in error_response and error_response["error_code"] == 3):
        return True
    else:
        return False


def check_for_duplicate_file_name(user_email, server_number):
    user_dir = get_username_from_email(user_email)
    try:
        # Execute the command to create a folder
        res = cmd.cmds["create_folder"](initialized_clients.get(server_number), user_dir)
        
        return res  # No error occurred, so return res 
    except Exception as e:
        print("Error while creating folder: ", e)
        return False  # Other 400 errors or exceptions occurred, so return False

def update_server_directory_id(email, server_name, new_file_id):
    try:
        # Get the existing server_info for the given email
        response = supabase.table('pikpak_data').select('server_info').eq('email', email).execute()
        data = response.data
    
        if data and data[0].get('server_info') is None:
            # If server_info is None, initialize it as an empty dictionary
            data[0]['server_info'] = {}

        if data:
            # Get the current server_info dictionary
            current_server_info = data[0].get('server_info', {})

            # Check if the specified server_name exists in server_info
            if server_name in current_server_info:
                # Update the directory_id for the specified server
                current_server_info[server_name]["directory_id"] = new_file_id
                current_server_info[server_name]["date"] = datetime.now().isoformat()
            else:
                # Update or create a new entry for the specified server_name
                current_server_info[server_name] = {
                    "date": datetime.now().isoformat(),  # Include the current date
                    "directory_id": new_file_id
                }

            # Construct the update command
            update_command = {
                "server_info": current_server_info
            }

            # Execute the update command and update the Supabase table
            response = supabase.table('pikpak_data').update(update_command).eq('email', email).execute()
        else:
            print("User data not found")
    except Exception as e:
        print(f"Error updating server directory ID: {str(e)}")

def switchserver(email):
    try:
        # Get all usernames from the usernamesArray
        usernames = usernamesArray

        # Construct the filter using the 'in' operator to retrieve data for all usernames
        response = supabase.table('premium_accounts').select('*').in_('username', usernames).execute()
        data = response.data

        # Process the data for each username
        for row in data:
            username = row.get('username')
            is_donated = row.get('isDonated')
            print("Processing data for username:", username)
            
            if is_donated == True:
                print("User has donated.")
                if username in usernamesArray:
                    server_number = usernamesArray.index(username) + 1
                    is_duplicated = check_for_duplicate_file_name(email, server_number)
                    print("is_duplicated", is_duplicated)
                    
                    if is_duplicated == False:
                        continue 
                    else:
                        file_id = is_duplicated["id"]
                        server_ID = f'PP-server#{server_number}'
                        print(f"Updating server directory ID for {username} - Server ID: {server_ID}, File ID: {file_id}")
                        update_server_directory_id(email, server_ID, file_id)
                else:
                    print(f"Username '{username}' not found in the usernamesArray.")
        
        return jsonify({'result': 'switch success'})  
    except Exception as e:
        print("switch Error: ", str(e))
        return jsonify({"error": str(e)}), 500
 
    
def generate_server_details(server_id, contact, expiry, limit, drive_used, created_at):
    return {
        "server_id": server_id,
        "created_at": created_at,
        "contact": contact,
        "expiry": expiry,
        "limit": limit,
        "drive_used": drive_used,
    }

@app.route('/getServers', methods=['GET'])
def get_servers():
    usernames = usernamesArray
    response = supabase.table('premium_accounts').select('*').in_('username', usernames).execute()
    supabase_data = response.data
    servers = {}

    
    for index, supabase_record in enumerate(supabase_data):
        username = supabase_record.get('username')
        print("username in get_servers", username)
        server_id = usernamesArray.index(username) + 1
        contact = supabase_record.get('contact-email', '')
        created_at = supabase_record.get('created_at', '')
        expiry = supabase_record.get('expiry_in_days', '')
        
        res = cmd.cmds["get_about_details"](initialized_clients.get(server_id))
        
        # Sample logic to retrieve drive stats, replace it with actual implementation
        limit = res.get('quota', {}).get('limit', '')  # Access limit for drive available
        drive_used = res.get('quota', {}).get('usage', '')  # Access usage for drive used

        server_details = generate_server_details(server_id, contact, expiry, limit, drive_used, created_at)
        servers[server_id] = server_details
    
    return jsonify(servers) 

@app.route('/insert_premium_account', methods=['POST'])
def insert_premium_account():
    try:
        # Extract data from request
        data = request.json
        username = data.get('username')
        password = data.get('password')
        pikpak_plus_email = data.get('email')
        contact_email = data.get('contactInfo')
        expiry_in_days = data.get('expiry')

        # Insert data into Supabase table
        response = supabase.table('premium_accounts').insert([
            {
                'username': username,
                'password': password,
                'pikpak-plus-email': pikpak_plus_email,
                'contact-email': contact_email,
                'expiry_in_days': expiry_in_days,
                'isDonated': True  # Default value
            }
        ]).execute()
        return jsonify({'message': 'Premium account inserted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# -------------------------------------------------------------------------------------------------------------

@app.route('/ping', methods=['GET'])
def ping():
    try:
        for server_number in range(1, len(usernamesArray) + 1):
            initialize_client_route(server_number)
        return {"message":"pong"}    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def get_directory_id(email):
    try:
        response = supabase.table('pikpak_data').select('server_info').eq('email', email).execute()
        data = response.data

        if data:
            directory_id = data[0]['server_info']
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
                switchserver(email)
                response = jsonify({'redirect': '/create',"dir":dir_id['directory_id'], "auth": data.session.access_token})                
                supabase.auth.sign_out()
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
            res = create_folder(email)

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