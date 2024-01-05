#!/bin/bash

# Change directory to the virtual environment Scripts directory
cd api
source ./venv/Scripts/activate

# Run Flask
flask run &

# Store the process ID of the Flask command
flask_pid=$!

# start  cd ..
# Run the dev script
start npm run dev

# Wait for Flask to finish
wait $flask_pid

# Deactivate the virtual environment when the scripts are done
deactivate
