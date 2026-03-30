import os
import subprocess
import shutil
import schedule
import time

# Define the paths for your Angular and Flask projects
base_dir = os.path.dirname(__file__)
angular_project_path = base_dir
flask_project_path = os.path.join(base_dir, '..')

# Define the command to build your Angular project
build_command = 'ng build --base-href /static/'

# Function to rebuild Angular project and copy files
def rebuild_and_copy():
    try:
        # Change the current working directory to your Angular project
        os.chdir(angular_project_path)
        
        # Run the Angular build command
        subprocess.run(build_command, shell=True, check=True)
        
        # Define the source and destination paths for copying build files
        build_source = os.path.join(angular_project_path, 'dist\\front-end')
        static_destination = os.path.join(flask_project_path, 'static')
        templates_destination = os.path.join(flask_project_path, 'templates')

        # Copy build files to Flask project
        shutil.rmtree(static_destination)  # Remove existing static files
        shutil.rmtree(templates_destination)  # Remove existing template files
        shutil.copytree(build_source, static_destination)
        shutil.copytree(build_source, templates_destination)

        print("Angular project rebuilt and files copied successfully.")

    except Exception as e:
        print(f"Error: {e}")

# Schedule the rebuild and copy job every 10 seconds
schedule.every(10).seconds.do(rebuild_and_copy)

# Run the scheduler
while True:
    schedule.run_pending()
    time.sleep(1)