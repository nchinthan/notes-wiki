from flask import Flask, request, jsonify,render_template,redirect, url_for, session
from functools import wraps
import uuid
from enum import IntEnum
from database.dataInterface import Map,Page
import json
import os
from scraping.main import routine_update , close_browser , init_browser
import threading
import sys
from database.authenticate import authenticate

def routine():
    init_browser()
    routine_update()
    close_browser()

# Run routine_update in a separate thread so it doesn't block server startup
threading.Thread(target=routine, daemon=True).start()

app = Flask(__name__)
app.secret_key = "jisooForever"

# Assuming Type is an IntEnum
class Type(IntEnum):
    page = 0
    map = 1
    

authorized_users = set()

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = session.get("user_id")
        if not user_id or user_id not in authorized_users:
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated_function

# -------------------------------
# Login Route (with UUID session)
# -------------------------------
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        data = request.get_json()
        if not data or not isinstance(data, dict):
            return render_template("login.html", error="Invalid data format")

        x = data.get("x", {})
        y = data.get("y", {})

        if not isinstance(x, dict) or not isinstance(y, dict):
            return render_template("login.html", error="x and y must be dictionaries")

        x_mean = float(x.get("mean"))
        x_std = float(x.get("std"))
        y_mean = float(y.get("mean"))
        y_std = float(y.get("std"))
        
        

        if None in [x_mean, x_std, y_mean, y_std]:
            return render_template("login.html", error="Missing mean or std in x or y")

        # -------------------------------
        # Implicitly identify the user
        # -------------------------------
        if "user_id" not in session:
            session["user_id"] = str(uuid.uuid4())  # assign new unique ID

        if authenticate(x_mean,x_std,y_mean,y_std):
            user_id = session["user_id"]
            authorized_users.add(user_id)

            print(f"[+] User {user_id} logged in with: x=({x_mean},{x_std}) y=({y_mean},{y_std})")

            return jsonify({
                "success": 1,
                "redirect": url_for("home", _external=False)
            })
        else:
            return jsonify({
                "success": 0,
                "message":"wrong credentials"
            })

    return render_template("login.html")

@app.route("/")
@login_required
def home():
    content_type = request.args.get("type")
    content_id = request.args.get("id")
    return render_template(
        "index.html",
        content_type=content_type,
        content_id=content_id,
        user_id=session.get("user_id")
    )

@app.route("/api/map", methods=["POST"])
def create_map():
    data = request.json
    title = data.get("title")
    parent_map_id = data.get("parent_map_id")
    
    if not title:
        return jsonify({"error": "title is required"}), 400
    
    map_id = Map.create(title, parent_map_id)
    return jsonify({"map_id": map_id})

@app.route("/api/map/<int:map_id>/rename",methods=['PUT'])
def rename_map(map_id):
    data = request.json
    new_name = data.get("new_name","")
    if new_name == "":
        return jsonify({"error": "new_name feild required"}), 400
    success,message = Map.rename(map_id,new_name)
    data = {
        "success":success,
        "message":message
    }
    return jsonify(data)

@app.route("/api/map/<int:map_id>/delete", methods=["GET"])
def delete_map(map_id):
    success,message = Map.delete(map_id)
    out = {
        "success":int(success),
        "message":message
    }
    return jsonify(out)

@app.route("/api/map/<int:map_id>/children", methods=["GET"])
def get_map_children(map_id):
    children = Map.get_children(map_id)
    return jsonify(children)

@app.route("/api/map/<int:map_id>/child", methods=["POST"])
def add_map_child(map_id):
    data = request.json
    child_id = data.get("child_id")
    type_ = data.get("type")  # 0 for page, 1 for map

    if child_id is None or type_ not in [0, 1]:
        return jsonify({"error": "child_id and valid type are required"}), 400

    Map.add_child(map_id, child_id, type_)
    return jsonify({"status": "child added"})

@app.route("/api/map/<int:map_id>/child/delete", methods=["DELETE"])
def remove_map_child(map_id):
    data = request.json
    child_id = data.get("child_id")
    type_ = data.get("type")

    if child_id is None or type_ not in [0, 1]:
        return jsonify({"error": "child_id and valid type are required"}), 400

    Map.rem_child(map_id, child_id, type_)
    return jsonify({"status": "child removed"})

@app.route("/api/page", methods=["POST"])
def create_page():
    data = request.json
    title = data.get("title")
    content = data.get("content")
    parent_map_id = data.get("parent_map_id")
    keywords = data.get("keywords", [])

    if not title or not content or parent_map_id is None:
        return jsonify({"error": "title, content, and parent_map_id are required"}), 400

    page_id = Page.create(title, content, parent_map_id, keywords)
    return jsonify({"page_id": page_id})

@app.route("/api/page/<int:page_id>", methods=["GET"])
def get_page(page_id):
    html = Page.getPage(page_id)
    if not html:
        return jsonify({"page_id": page_id, "content": {
            "id": -1,
            "title": "PAGE DOESNT EXIST", 
            "html": '''
                <div class="text-center">
                    <img src="/static/images/404.png" alt="Not Found" class="img-fluid" style="max-width: 50%; height: auto;">
                    <h1>404 - Page Not Found</h1>
                    <p>The page you are looking for does not exist.</p>
                    <a href="/" class="btn btn-primary">Go Back Home</a>
                </div>
            '''
        }})
    return jsonify({"page_id": page_id, "content": html})

@app.route("/api/page/<int:page_id>/delete",methods=["DELETE"])
def delete_page(page_id):
    success,message = Page.delete(page_id)
    out = {
        "success": int(success),
        "message":message
    }
    return jsonify(out)

@app.route("/api/page/<int:page_id>/update", methods=["PUT"])
def update_page(page_id):
    data = request.json
    content = data.get("content")

    if not content:
        return jsonify({"message": "content is required","success":0}), 400

    modified = Page.update(page_id, content)
    data = {
        "message": "page updated" if modified else "No changes to update",
        "success":1,
        "page_id": page_id
    }
    return jsonify(data)

@app.route("/api/page/popular", methods=["GET"])
def popular_pages():
    limit = request.args.get("limit", default=5, type=int)
    pages = Page.popular_pages(limit)
    return jsonify(pages)

@app.route("/api/page/discover", methods=["GET"])
def discover_pages():
    limit = request.args.get("limit", default=5, type=int)
    pages = Page.discover_pages(limit)
    return jsonify(pages)

@app.route("/api/page/search", methods=["GET"])
def search_pages():
    query = request.args.get("q", "")
    if not query:
        return jsonify({"error": "query is required"}), 400

    results = Page.search(query)
    return jsonify(results)

@app.route("/api/page/<int:page_id>/keywords", methods=["POST"])
def add_keywords(page_id):
    data = request.json
    keywords = data.get("keywords", [])

    if not isinstance(keywords, list) or not keywords:
        return jsonify({"error": "A non-empty list of keywords is required"}), 400

    Page.addKeywords(page_id, keywords)
    return jsonify({"status": "keywords added", "page_id": page_id})

json_path = os.path.join(os.path.dirname(__file__), "scraping", "websites.json")
@app.route("/api/page/fromWeb", methods=["GET"])
def from_web():
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return jsonify(data)



if __name__ == "__main__":
    ip = "127.0.0.1"
    port = 5000

    if len(sys.argv) > 1:
        arg = sys.argv[1]
        if ':' in arg:
            ip, port = arg.split(':')
            port = int(port)

    app.run(host=ip, port=port, debug=True)
