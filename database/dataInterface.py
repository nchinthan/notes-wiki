from .sqlInterface import DataBase
from .queryRetreival import Retreiver,RetreiverType
import json
from .config import HTML_PATH
from .content.notes_io import read_file,write_chunk,create_file,CHUNK_SIZE
import math 
import hashlib
import os 

def sha256_string(text):
    # Create a SHA-256 hash object
    sha256_hash = hashlib.sha256()
    
    # Update the hash with the encoded string (UTF-8)
    sha256_hash.update(text.encode('utf-8'))
    
    # Get the hexadecimal digest
    return sha256_hash.hexdigest()

db = DataBase()
queryRet = Retreiver()

ROOT_ID = 1

def ensure_root_map():
    res = db.run('SELECT id FROM map WHERE id = 1 AND title = "root"')
    if len(res) == 0:
        print("creating root")
        db.run('INSERT INTO map (id, title) VALUES (1, "root")')

ensure_root_map()

def save_html(id, title, content):
    data = {
        "title": title,
        "html": content
    }
    with open(f"{HTML_PATH}/{id}.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

def get_html(id):
    try:
        with open(f"{HTML_PATH}/{id}.json", "r", encoding="utf-8") as f:
            data = json.load(f)
        return data
    except FileNotFoundError:
        return None

# for identifying
class Type:
    page = 0
    map = 1

class Map:
    @staticmethod
    def create(title:str,parent_map_id=None) -> int:
        map_id = db.run(f"insert into map (title) values(\"{title}\")",captureNewID=True)[0]
        if parent_map_id is not None:
            Map.add_child(parent_map_id,map_id,Type.map)
        return map_id
    
    @staticmethod
    def get_children(map_id:int):
        res = db.call_procedure("getMapChildren", [map_id])
        # Convert list of tuples to list of dicts for pages
        pages = [{"id": row[0], "title": row[1], "view": row[2], "ref_cnt": row[3]} for row in res[0]]
        # Convert list of tuples to list of dicts for maps
        maps = [{"id": row[0], "title": row[1]} for row in res[1]]
        out = {
            "pages": pages,
            "maps": maps
        }
        return out
        
    @staticmethod
    def add_child(map_id,child_id,type:Type):
        print(map_id,child_id)
        col = ["child_page_id","child_map_id"][type]
        st = f"""INSERT INTO childMap (parent_map_id, {col})
            select {map_id},{child_id} from dual 
            where not exists
            ( select parent_map_id,child_page_id 
            from childMap 
            where parent_map_id = {map_id} and child_page_id = {child_id});"""
        l = db.run(st)
        return l!=-1
        
    @staticmethod
    def rem_child(map_id,child_id,type):
        col = ["child_page_id","child_map_id"][type]
        l = db.run(f"DELETE FROM childMap WHERE parent_map_id = {map_id} AND {col}={child_id};")
        return l!=1 
    
class Page:
    @staticmethod
    def create(title,content,parentMapid,keywords=[]) -> int:
        keyword_str = ",".join(keywords)
        pageId = db.call_procedure("createNote", [title, parentMapid, keyword_str, None], capture_out=True)[-1]
    
        filename = os.path.join(HTML_PATH,str(pageId))
        
        # create the file with title
        create_file(filename)
        
        hashInsertSql = 'INSERT INTO pageChunkHash(page_id,chunk_index,chunk_hash) VALUES'
        # write each chunk
        for chunk_index in range(math.ceil(len(content)/CHUNK_SIZE)):
            chunk = content[chunk_index*CHUNK_SIZE:(chunk_index+1)*CHUNK_SIZE]
            write_chunk(filename,chunk,chunk_index)
            # add hash of each file to table 
            chunk_hash = sha256_string(chunk)
            hashInsertSql += f"({pageId},{chunk_index},'{chunk_hash}'),"
        
        # insert hashes 
        db.run(hashInsertSql.removesuffix(","))    

        keywords.extend(title.split())
        Page.addKeywords(pageId,keywords)
        return pageId
    
    @staticmethod
    def update(pageId,content):
        filename = os.path.join(HTML_PATH,str(pageId))
        all_prev_chunks = db.run(f'select chunk_index,chunk_hash from pageChunkHash where page_id = {pageId} order by chunk_index')
        prev_content_chunks = len(all_prev_chunks)
        new_content_chunks = math.ceil(len(content)/CHUNK_SIZE)
        
        updation_sql = 'INSERT INTO pageChunkHash(page_id,chunk_index,chunk_hash) VALUES'
        
        modified = False
        for chunk_index in range(new_content_chunks):
            chunk = content[chunk_index*CHUNK_SIZE:(chunk_index+1)*CHUNK_SIZE]
            chunk_hash = sha256_string(chunk)
            if chunk_index < prev_content_chunks and not modified:
                if chunk_hash == all_prev_chunks[chunk_index][1]:
                    continue 
                # hash change in chunk
                else:
                    modified = True 
            # new chunks added 
            else:
                modified = True
            
            # write new modified chunks
            if modified:
                updation_sql += f'({pageId},{chunk_index},{chunk_hash})'
                write_chunk(filename,chunk,chunk_index)
        
        db.run(updation_sql)
             
        # delete extra ones chunks if present in prev version
        if prev_content_chunks < new_content_chunks:
            range(prev_content_chunks,new_content_chunks)
            del_sql = f'DELETE FROM pageChunkHash where page_id = {pageId} and chunk_index in ({','.join(map(str,range(prev_content_chunks,new_content_chunks)))})'
            db.run(del_sql)
        """
        get all chunk_index,chunk_hash from table 
        modified = false
        for chunk_index in range(math.ceil(len(content)/CHUNK_SIZE)):
            chunk = content[chunk_index*CHUNK_SIZE:(chunk_index+1)*CHUNK_SIZE]
            if (not modified) and (hash(chunk) == tables hash):
                continue 
            else:
                modified = true
                write_chunk(filename,chunk,chunk_index)
        """
        pass
    
    # getting the html of page
    @staticmethod
    def getPage(page_id):
        # Get page title and keywords from SQL
        res = db.run(f"SELECT title FROM page WHERE id = {page_id}")
        # Update last_accessed to current timestamp
        db.run(f"UPDATE page SET last_accessed = CURRENT_TIMESTAMP, view = view + 1 WHERE id = {page_id} ")
        if not res:
            return None
        title = res[0][0]
        content = read_file(os.path.join(HTML_PATH,str(page_id)))
        return {"id": page_id, "title": title, "html": content}
    
    @staticmethod
    def search(query):
        # search keyword table for keyword with text search : query then get ids ang join pageKeywordMap on these ids limit 100 and then join page table
        page_ids = []
        for quer in query.split():
            page_ids.extend(queryRet.retreive(quer)["page"])
        if len(page_ids) == 0:
            return []
        placeholders = ",".join(str(pid) for pid in page_ids)
        res = db.run(f"SELECT id, title FROM page WHERE id IN ({placeholders})")
        out = [{"id": row[0], "title": row[1]} for row in res]
        return out
    
    @staticmethod
    def addKeywords(page_id,keywords:list):
        for keyword in keywords:
            queryRet.add(keyword,page_id,RetreiverType.PAGE)

    @staticmethod
    def popular_pages(limit=5):
        res1 = db.run(f"SELECT id, title FROM page ORDER BY view DESC LIMIT {int(limit/2)}")
        res2 = db.run(f"SELECT id, title FROM page ORDER BY ref_cnt DESC LIMIT {int(limit/2)}")

        return [{"id": row[0], "title": row[1]} for row in res1 + res2]

    @staticmethod
    def discover_pages(limit=5):
        res = db.run(f"SELECT id, title FROM page ORDER BY last_accessed DESC LIMIT {limit}")
        return [{"id": row[0], "title": row[1]} for row in res]
    
if __name__ == "__main__":
    print(Map.get_children(1))
