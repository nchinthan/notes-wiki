import mysql.connector
from .config import host, username, password, dbname

class DataBase:
    def __init__(self):
        self.conn = mysql.connector.connect(
            host=host,
            user=username,
            password=password,
            database=dbname
        )
        self.logfile = open("DBlog.txt",'w',encoding="utf-8")
        
    def log(self,txt):
        self.logfile.write(txt+'\n')

    # for procedure
    # capture output in case args have field with OUT type
    def call_procedure(self, proc_name, args=[],capture_out=False):
        try:
            cursor = self.conn.cursor()
            out = cursor.callproc(proc_name, args)
            self.conn.commit()

            if capture_out:
                return out
            results = []
            for result in cursor.stored_results():
                rows = result.fetchall()
                results.append(rows)
            self.log("running procedure : "+proc_name)
            return results
        except Exception as e:
            self.log(f"Error calling procedure '{proc_name}': {e}")
            return -1
        finally:
            if cursor:
                cursor.close()
   
    def run(self, script,captureNewID = False):
        """
        Executes a raw SQL script (can be multiple statements).

        Args:
            script (str): The SQL script to execute.

        Returns:
            output from all executed statements as a list of results, or None if error.
        """
        try:
            cursor = self.conn.cursor()            
            cursor.execute(script)

            results = cursor.fetchall()
            self.conn.commit()
            
            if captureNewID:results.append(cursor.lastrowid)
            self.log(script)
            return results

        except Exception as e:
            self.log(f"Error executing script({script}): {e}")
            self.conn.rollback()
            return -1

        finally:
            if cursor:
                cursor.close()


