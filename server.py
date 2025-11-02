from flask import Flask, request, jsonify,render_template
from enum import IntEnum
from database.dataInterface import Map,Page
import json
import os
from scraping.main import routine_update , close_browser , init_browser
import threading

def routine():
    init_browser()
    routine_update()
    close_browser()

# Run routine_update in a separate thread so it doesn't block server startup
threading.Thread(target=routine, daemon=True).start()

app = Flask(__name__)

# Assuming Type is an IntEnum
class Type(IntEnum):
    page = 0
    map = 1

@app.route("/map", methods=["POST"])
def create_map():
    data = request.json
    title = data.get("title")
    parent_map_id = data.get("parent_map_id")
    
    if not title:
        return jsonify({"error": "title is required"}), 400
    
    map_id = Map.create(title, parent_map_id)
    return jsonify({"map_id": map_id})

@app.route("/map/<int:map_id>/children", methods=["GET"])
def get_map_children(map_id):
    children = Map.get_children(map_id)
    return jsonify(children)

@app.route("/map/<int:map_id>/child", methods=["POST"])
def add_map_child(map_id):
    data = request.json
    print(data)
    child_id = data.get("child_id")
    type_ = data.get("type")  # 0 for page, 1 for map

    if child_id is None or type_ not in [0, 1]:
        return jsonify({"error": "child_id and valid type are required"}), 400

    Map.add_child(map_id, child_id, type_)
    return jsonify({"status": "child added"})

@app.route("/map/<int:map_id>/child/delete", methods=["DELETE"])
def remove_map_child(map_id):
    data = request.json
    child_id = data.get("child_id")
    type_ = data.get("type")

    if child_id is None or type_ not in [0, 1]:
        return jsonify({"error": "child_id and valid type are required"}), 400

    Map.rem_child(map_id, child_id, type_)
    return jsonify({"status": "child removed"})

@app.route("/page", methods=["POST"])
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

@app.route("/page/<int:page_id>", methods=["GET"])
def get_page(page_id):
    html = Page.getPage(page_id)
    return jsonify({"page_id": page_id, "content": html})

@app.route("/page/<int:page_id>/delete",methods=["DELETE"])
def delete_page(page_id):
    success,message = Page.delete(page_id)
    out = {
        "success": int(success),
        "message":message
    }
    return jsonify(out)

@app.route("/page/<int:page_id>/update", methods=["PUT"])
def update_page(page_id):
    data = request.json
    content = data.get("content")

    if not content:
        return jsonify({"error": "content is required"}), 400

    Page.update(page_id, content)
    return jsonify({"status": "page updated", "page_id": page_id})

@app.route("/page/popular", methods=["GET"])
def popular_pages():
    limit = request.args.get("limit", default=5, type=int)
    pages = Page.popular_pages(limit)
    return jsonify(pages)

@app.route("/page/discover", methods=["GET"])
def discover_pages():
    limit = request.args.get("limit", default=5, type=int)
    pages = Page.discover_pages(limit)
    return jsonify(pages)

@app.route("/page/search", methods=["GET"])
def search_pages():
    query = request.args.get("q", "")
    if not query:
        return jsonify({"error": "query is required"}), 400

    results = Page.search(query)
    return jsonify(results)

@app.route("/page/<int:page_id>/keywords", methods=["POST"])
def add_keywords(page_id):
    data = request.json
    keywords = data.get("keywords", [])

    if not isinstance(keywords, list) or not keywords:
        return jsonify({"error": "A non-empty list of keywords is required"}), 400

    Page.addKeywords(page_id, keywords)
    return jsonify({"status": "keywords added", "page_id": page_id})

json_path = os.path.join(os.path.dirname(__file__), "scraping", "websites.json")
@app.route("/page/fromWeb", methods=["GET"])
def from_web():
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return jsonify(data)

@app.route("/")
def home():
    return render_template("index.html")

if __name__ == "__main__":
    app.run(debug=True)
