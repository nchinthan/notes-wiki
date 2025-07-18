from flask import Flask, request, jsonify,render_template
from enum import IntEnum
from database.dataInterface import Map,Page

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
    child_id = data.get("child_id")
    type_ = data.get("type")  # 0 for page, 1 for map

    if child_id is None or type_ not in [0, 1]:
        return jsonify({"error": "child_id and valid type are required"}), 400

    Map.add_child(map_id, child_id, type_)
    return jsonify({"status": "child added"})

@app.route("/map/<int:map_id>/child", methods=["DELETE"])
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


# Optional: Health check or root
@app.route("/")
def home():
    return render_template("index.html")

if __name__ == "__main__":
    app.run(debug=True)
