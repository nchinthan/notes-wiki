import base64
import json
import os,time,threading

data_loc = r'D:\projects\notes\notes_new\database\queryRet.json'

class RetreiverType:
    PAGE = 0
    # convert index to value
    inv = ["page"]

class Retreiver:
    def __init__(self,loc=data_loc):
        self.data_loc = loc
        with open(self.data_loc,'r') as f:
            self.d = json.load(f)
            print('query-json-file opened...')
            
        # --- Threading setup ---
        self.save_interval_seconds = 60 # Interval in seconds for auto-saving
        self._running = True # Flag to control thread execution
        self._save_thread = threading.Thread(target=self._auto_save_loop, args=(self.save_interval_seconds,), daemon=True)
        self._save_thread.start()
        print(f"Auto-save thread started, saving every {self.save_interval_seconds} seconds.")

        # --- Thread safety: Lock for data access ---
        self._lock = threading.Lock() # A lock to protect self.d during read/write operations
        self.modified = False # Flag to track if data has been modified since last save

    def _auto_save_loop(self, interval):
        """
        Internal method for the auto-save thread.
        Saves the data at regular intervals.
        """
        while self._running:
            time.sleep(interval)
            if self._running and self.modified: # Check _running again after sleep in case shutdown signal came
                self.save()
    
    def retreive(self,query):
        res = get_id(query.lower(),0,self.d)
        out = {
            k:set() for k in RetreiverType.inv
        }
        for Id,Type in res:
            out[RetreiverType.inv[Type]].add(Id)
        
        for i in out:
            out[i] = list(out[i])
        return out
    
    def add(self,title,ID,Type):
        title = title.lower().strip()
        val = [ID,Type]
        with self._lock: # Acquire the lock before reading self.d
            add2(title,val,0,self.d)
            self.modified = True
        
    def save(self):
        with self._lock: # Acquire the lock before reading self.d
            with open(self.data_loc, 'w') as f:
                json.dump(self.d,f)
            print("file saved...")
            self.modified = False

def load_serialized(path):
    with open(path,'rb') as f:
        audio_bin = f.read()
        audio_base64 = base64.b64encode(audio_bin).decode("utf-8")
    return audio_base64

def get_id(s,i,d):
    if s[i] in d:
        if i == len(s)-1:
            return get_songs(s[i],d)
        return get_id(s,i+1,d[s[i]][1])
    else:return []

def get_songs(c,d):
    if len(d[c][1].keys()) == 0:
         return d[c][0]
    songs = d[c][0]
    for i in d[c][1]:
         songs = songs + get_songs(i,d[c][1])
    return songs

def add2(s,ID,i,d):
    if s[i] not in d:
        d[s[i]] = [list(),dict()]
    if i == len(s)-1:
        d[s[i]][0].append(ID)
        d[s[i]][0] = (d[s[i]][0])
        return
    add2(s,ID,i+1,d[s[i]][1])
