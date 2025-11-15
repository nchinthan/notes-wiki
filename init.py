import os
import subprocess

# Define the database directory path
database_dir = os.path.join(os.path.dirname(__file__), 'database')

# Change to the database directory
os.chdir(database_dir)

# Run dbinit.py
subprocess.run(['python', 'dbinit.py'], check=True)
