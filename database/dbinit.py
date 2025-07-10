import subprocess
import sys
import os
import random
import shutil
import tempfile
import getpass

mysql_executable = "mysql"
SQL_SCRIPTS_FOLDER = "./scripts"
SQL_SCRIPTS = ["create.sql", "procedures.sql","init.sql"]

DATABASE_NAME = "notes_db"

CONFIG_PATH = "config.py"

HTML_PATH = "Pages"

db_config = {"host": "localhost"}

def install_packages():
    print("Installing required Python packages...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "mysql-connector-python"])

def check_mysql():
    global mysql_executable
    print("Checking for MySQL installation...")

    if shutil.which("mysql") is not None:
        mysql_executable = shutil.which("mysql")
        print(f"✅ MySQL is found: {mysql_executable}")
        return

    possible_paths = [
        r"C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe",
        r"C:\\Program Files (x86)\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe",
        r"C:\\xampp\\mysql\\bin\\mysql.exe"
    ]

    for path in possible_paths:
        if os.path.exists(path):
            mysql_executable = path
            print(f"✅ MySQL found at: {path}")
            return

    print("❌ MySQL not found in PATH or known locations.")
    user_path = input("Enter full path to mysql.exe (e.g., C:/path/to/mysql.exe): ").strip()
    if os.path.exists(user_path):
        mysql_executable = user_path
        print(f"✅ MySQL found at: {user_path}")
    else:
        print("❌ Could not find mysql at the specified location.")
        sys.exit(1)

def get_database_name():
    name = DATABASE_NAME
    while True:
        result = subprocess.run([
            mysql_executable,
            f"-u{db_config['user']}",
            f"-p{db_config['password']}",
            "-e",
            f"USE {name};"
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        if result.returncode != 0:
            break
        name = f"{DATABASE_NAME}_{random.randint(1000, 9999)}"
    return name

def create_database(db_name):
    print(f"Creating database: {db_name}...")
    subprocess.run([
        mysql_executable,
        f"-u{db_config['user']}",
        f"-p{db_config['password']}",
        "-e",
        f"CREATE DATABASE {db_name};"
    ], check=True)

def run_sql_scripts(db_name):
    print("\nRunning SQL setup scripts...")
    for sql_file in SQL_SCRIPTS:
        run_sql_script(sql_file, db_name)

def run_sql_script(filename, db_name):
    script_path = os.path.join(SQL_SCRIPTS_FOLDER, filename)
    if not os.path.exists(script_path):
        print(f"❌ File not found: {script_path}")
        return

    print(f"Executing: {filename}")
    command = [
        mysql_executable,
        f"-h{db_config['host']}",
        f"-u{db_config['user']}",
        f"-p{db_config['password']}",
        db_name
    ]
    with open(script_path, "r") as file:
        print("running:",script_path)
        subprocess.run(command, stdin=file, check=True)

def update_config_file(db_name):
    print(f"Updating config.py at {CONFIG_PATH}...")
    with open(CONFIG_PATH, "w") as f:
        f.write(f"host = 'localhost'\n")
        f.write(f"username = '{db_config['user']}'\n")
        f.write(f"password = '{db_config['password']}'\n")
        f.write(f"dbname = '{db_name}'\n")
        f.write(f"HTML_PATH = r'database\{HTML_PATH}'")

def main():
    install_packages()

    user = input("Enter MySQL username: ").strip()
    password = getpass.getpass(f"Enter MySQL password for {user}: ")

    db_config["user"] = user 
    db_config["password"] = password
    
    db_name = get_database_name()
    create_database(db_name)
    update_config_file(db_name)
    run_sql_scripts(db_name)
    
    with open("queryRet.json", "w") as f:
        f.write("{}")
        
    os.mkdir(HTML_PATH)

    print(f"\n✅ Setup complete! Database created as: {db_name}")
    print("👉 Run your server with: python server.py")


if __name__ == "__main__":
    check_mysql()

    if "--no-db-init-script" in sys.argv[1:]:
        files = sys.argv[1:]
        files.pop(files.index("--no-db-init-script"))
        
        import importlib.util
        
        module_name = os.path.splitext(os.path.basename(CONFIG_PATH))[0]  # "config"

        spec = importlib.util.spec_from_file_location(module_name, CONFIG_PATH)
        config = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(config)

        db_config["user"] = config.username
        db_config["password"] = config.password
        db_config["db_name"] = config.dbname
        SQL_SCRIPTS.clear()
        SQL_SCRIPTS.extend(files)
        run_sql_scripts(db_config["db_name"])
    else:
        main()

