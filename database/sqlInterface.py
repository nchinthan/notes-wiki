import mysql.connector
from .config import host, username, password, dbname
import threading
import queue


class DataBase:
    def __init__(self):
        self.conn = mysql.connector.connect(
            host=host,
            user=username,
            password=password,
            database=dbname
        )
        self.logfile = open("DBlog.txt", 'w', encoding="utf-8")

        # Shared queue and worker thread
        self.task_queue = queue.Queue()
        self.worker_thread = threading.Thread(target=self._worker_loop, daemon=True)
        self.worker_thread.start()

    # ---------- Logging ----------
    def log(self, txt):
        self.logfile.write(txt + '\n')
        self.logfile.flush()

    # ---------- Worker loop ----------
    def _worker_loop(self):
        """Continuously process queued database tasks."""
        while True:
            task = self.task_queue.get()
            if task is None:
                break  # For graceful shutdown if needed

            task_type, params, result_holder = task

            try:
                if task_type == "run":
                    res = self._run_direct(**params)
                elif task_type == "call_procedure":
                    res = self._call_procedure_direct(**params)
                else:
                    res = None
            except Exception as e:
                res = f"Error in worker: {e}"

            result_holder.put(res)
            self.task_queue.task_done()

    # ---------- Threaded public methods ----------
    def call_procedure(self, proc_name, args=[], capture_out=False):
        """Threaded version of call_procedure."""
        result_holder = queue.Queue(maxsize=1)
        self.task_queue.put((
            "call_procedure",
            {"proc_name": proc_name, "args": args, "capture_out": capture_out},
            result_holder
        ))
        return result_holder.get()

    def run(self, script, captureNewID=False):
        """Threaded version of run."""
        result_holder = queue.Queue(maxsize=1)
        self.task_queue.put((
            "run",
            {"script": script, "captureNewID": captureNewID},
            result_holder
        ))
        return result_holder.get()

    # ---------- Internal (original logic preserved) ----------
    def _call_procedure_direct(self, proc_name, args=[], capture_out=False):
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

            self.log("running procedure : " + proc_name)
            return results

        except Exception as e:
            self.log(f"Error calling procedure '{proc_name}': {e}")
            return -1

        finally:
            if cursor:
                cursor.close()

    def _run_direct(self, script, captureNewID=False):
        try:
            cursor = self.conn.cursor()
            cursor.execute(script)
            results = cursor.fetchall()
            self.conn.commit()

            if captureNewID:
                results.append(cursor.lastrowid)

            self.log(script)
            return results

        except Exception as e:
            self.log(f"Error executing script({script}): {e}")
            self.conn.rollback()
            return -1

        finally:
            if cursor:
                cursor.close()
