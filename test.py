import os,json 
from database.dataInterface import Map,Page,queryRet

path = r"D:\projects\notes\json"
fil = ["optimization problems","machineLearning","maths","OS"]

map_id = Map.create("3rd sem",1)

def create_page(file,pid):
    with open(file,'r') as fp:
        d = json.load(fp)
        title = d["content"]["heading"]
        html =  d["content"]["text"]
        Page.create(title,html,pid,[])

def create_map(tit,path,pid):
    map_id = Map.create(tit,pid)
    path = os.path.join(path,tit)
    for i in os.listdir(path):
        fil,ext = os.path.splitext(i)
        if ext == "":
            create_map(i,path,map_id)
        else:
            create_page(os.path.join(path,i),map_id)

for i in os.listdir(path):
    t = i in fil
    mid = 1*(t) + map_id*(not t)
    create_map(i,path,mid)

queryRet.save()