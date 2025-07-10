from .sqlInterface import DataBase
from .queryRetreival import Retreiver,RetreiverType
import json
from .config import HTML_PATH

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
        col = ["child_page_id","child_map_id"][type]
        l = db.run(f"insert into childMap(parent_map_id,{col}) values({map_id},{child_id})")
        return l!=-1
        
    @staticmethod
    def rem_child(map_id,child_id,type):
        col = ["child_page_id","child_map_id"][type]
        l = db.run(f"DELETE FROM childMap WHERE parent_map_id = {map_id} AND {col}={child_id};")
        return l!=1 
    
class Page:
    @staticmethod
    def create(title,content,parentMapid,keywords:list) -> int:
        keyword_str = ",".join(keywords)
        pageId = db.call_procedure("createNote",[title, parentMapid, keyword_str,None],capture_out=True)[-1]
        save_html(pageId,title,content)
        keywords.extend(title.split())
        Page.addKeywords(pageId,keywords)
        return pageId
    
    # getting the html of page
    @staticmethod
    def getPage(page_id):
        return get_html(page_id)
    
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

if __name__ == "__main__":
    print(Map.get_children(1))
