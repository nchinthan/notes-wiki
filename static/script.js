function capitalize(str) {
  // Check if the input is a string and not empty
  if (typeof str !== 'string' || str.length === 0) {
    return ''; // Return an empty string for invalid or empty input
  }

  // Split the string into an array of words
  const words = str.split(' ');

  // Map over the words, capitalizing the first letter of each word
  const capitalizedWords = words.map(word => {
    if (word.length === 0) {
      return ''; // Handle multiple spaces by returning an empty string for empty words
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  });

  // Join the capitalized words back into a single string
  return capitalizedWords.join(' ');
}

function latexCleaning(body){
	let l = body.querySelectorAll('.katex');
	l.forEach((e)=>{
    	// 1. Select the element to remove
    	let elementToRemove = e.querySelector('.katex-html');

    	// 2. Check if the element exists and has a parent
    	if (elementToRemove && elementToRemove.parentNode) {
        	// 3. Call removeChild on the *actual* parent node
        	elementToRemove.parentNode.removeChild(elementToRemove);
    	}
	elementToRemove = e.querySelector(".base");
	if (elementToRemove && elementToRemove.parentNode) {
        	// 3. Call removeChild on the *actual* parent node
        	elementToRemove.parentNode.removeChild(elementToRemove);
    	}});
}


class MapAPI {
  async renameMap(mapId, newName) {
    const res = await  fetch(`/api/map/${mapId}/rename`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_name: newName })
    });
    return res.json();
  }

  async deleteMap(mapId) {
    const res = await  fetch(`/api/map/${mapId}/delete`, { method: "GET" });
    return res.json();
  }

  async moveChild(targetMapId, parentMapId, childId, type) {
    const token = get_CSRF?.();

    // Add to new target
    await  fetch(`/api/map/${targetMapId}/child`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "X-CSRF-Token": token } : {})
      },
      body: JSON.stringify({ child_id: childId, type: type === "map" ? 1 : 0 })
    });

    // Remove from old parent
    if (parentMapId && parentMapId !== targetMapId) {
      await  fetch(`/api/map/${parentMapId}/child/delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-CSRF-Token": token } : {})
        },
        body: JSON.stringify({ child_id: childId, type: type === "map" ? 1 : 0 })
      });
    }
  }
}

class MapUI {
  constructor(api, pageLoader) {
    this.api = api;
    this.pageLoader = pageLoader;
  }

  render(container, data, currentMapId) {
    container.innerHTML = this._generateHTML(data);
    this._setupInteractions(container, data, currentMapId);
  }

  _generateHTML(data) {
    return `
      ${data.parent_id ? `
        <div class="text-neon mb-3">
          <button class="btn btn-outline-warning btn-sm" onclick="app.pageManager.loadMap(${data.parent_id})">
            <i class="bi bi-arrow-up"></i> back to ${data.name}'s parent
          </button>
        </div>
      ` : ''}
      <div class="text-neon mb-4">
        <h3><i class="bi bi-diagram-3"></i> Sub Maps</h3>
        ${data.maps.length > 0 ? `
          <ul id="map-list" class="list-group shadow">
            ${data.maps.map(m => `
              <li class='list-group-item bg-dark text-light border-secondary map-item d-flex justify-content-between align-items-center'
                  data-id='${m.id}' data-type='map'>
                <div class="d-flex align-items-center flex-grow-1">
                  <span class="me-2">🗺️</span>
                  <a style="text-decoration: none;cursor:pointer;" class='link-warning map-title' 
                    onclick='app.pageManager.loadMap(${m.id})'>${capitalize(m.title)}</a>
                  <span class="editable-title ms-2" 
                        contenteditable="false" 
                        data-original-name="${m.title}"
                        data-map-id="${m.id}"
                        style="display: none;">${capitalize(m.title)}</span>
                  <button class="btn btn-sm btn-success save-rename-btn ms-2" style="display: none;">
                    <i class="bi bi-check"></i>
                  </button>
                  <button class="btn btn-sm btn-secondary cancel-rename-btn ms-1" style="display: none;">
                    <i class="bi bi-x"></i>
                  </button>
                </div>
                <div class="btn-group">
                  <button class="btn btn-sm btn-outline-primary rename-map-btn" data-mapid="${m.id}">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger delete-map-btn" data-mapid="${m.id}">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </li>`).join('')}
          </ul>
        ` : '<p class="text-muted">No sub maps available</p>'}
      </div>
      <div class="text-neon">
        <h3><i class="bi bi-file-earmark-text"></i> Pages</h3>
        ${data.pages.length > 0 ? `
          <ul id="page-list" class="list-group shadow">
            ${data.pages.map(p => `
              <li class='list-group-item bg-dark text-light border-secondary page-item'
                  data-id='${p.id}' data-type='page'>
                <a style="text-decoration: none;cursor:pointer;" class='link-info' 
                  onclick='app.pageManager.loadPage(${p.id})'>📄 ${capitalize(p.title)}</a>
              </li>`).join('')}
          </ul>
        ` : '<p class="text-muted">No pages available</p>'}
      </div>`;
  }

  _setupInteractions(container, data, currentMapId) {
    const mapItems = container.querySelectorAll(".map-item");
    const pageItems = container.querySelectorAll(".page-item");

    mapItems.forEach(li => this._makeDraggable(li, { id: +li.dataset.id, type: "map" }));
    pageItems.forEach(li => this._makeDraggable(li, { id: +li.dataset.id, type: "page" }));

    mapItems.forEach(li => {
      const targetMapId = +li.dataset.id;
      this._makeDropTarget(li, targetMapId, currentMapId);
    });

    if (data.parent_id) {
      const parentButton = container.querySelector("button.btn-outline-warning");
      if (parentButton) {
        this._makeDropTarget(parentButton, data.parent_id, currentMapId);
      }
    }

    this._setupRenameHandlers(container);
    this._setupDeleteHandlers(container, currentMapId);
  }

  // UI event wiring
  _setupRenameHandlers(container) {
    container.querySelectorAll(".rename-map-btn").forEach(btn =>
      btn.addEventListener("click", e => this._startRename(e, btn))
    );
    container.querySelectorAll(".save-rename-btn").forEach(btn =>
      btn.addEventListener("click", e => this._saveRename(e, btn))
    );
    container.querySelectorAll(".cancel-rename-btn").forEach(btn =>
      btn.addEventListener("click", e => this._cancelRename(e, btn))
    );
    container.querySelectorAll(".editable-title").forEach(editable =>
      editable.addEventListener("keydown", e => this._handleKeyPress(e, editable))
    );
  }

  _startRename(e, btn) {
    e.stopPropagation();
    const li = btn.closest('.map-item');
    const a = li.querySelector('.map-title');
    const edit = li.querySelector('.editable-title');
    const save = li.querySelector('.save-rename-btn');
    const cancel = li.querySelector('.cancel-rename-btn');
    const rename = li.querySelector('.rename-map-btn');
    a.style.display = 'none';
    edit.style.display = 'inline';
    edit.contentEditable = true;
    save.style.display = cancel.style.display = 'inline-block';
    rename.style.display = 'none';
    edit.focus();
  }

  async _saveRename(e, btn) {
    e.stopPropagation();
    const li = btn.closest('.map-item');
    const a = li.querySelector('.map-title');
    const edit = li.querySelector('.editable-title');
    const save = li.querySelector('.save-rename-btn');
    const cancel = li.querySelector('.cancel-rename-btn');
    const rename = li.querySelector('.rename-map-btn');
    const id = edit.dataset.mapId;
    const oldName = edit.dataset.originalName;
    const newName = edit.textContent.trim();

    if (!newName) return alert("Map name cannot be empty!");

    try {
      const res = await this.api.renameMap(id, newName);
      if (res.success) {
        a.textContent = newName;
        edit.textContent = newName;
        edit.dataset.originalName = newName;
      } else {
        alert(res.message);
      }
    } catch (err) {
      console.error(err);
      alert("Rename failed.");
    }
    this._exitEditMode(a, edit, save, cancel, rename);
  }

  _cancelRename(e, btn) {
    e.stopPropagation();
    const li = btn.closest('.map-item');
    const a = li.querySelector('.map-title');
    const edit = li.querySelector('.editable-title');
    const save = li.querySelector('.save-rename-btn');
    const cancel = li.querySelector('.cancel-rename-btn');
    const rename = li.querySelector('.rename-map-btn');
    edit.textContent = edit.dataset.originalName;
    this._exitEditMode(a, edit, save, cancel, rename);
  }

  _exitEditMode(a, edit, save, cancel, rename) {
    a.style.display = 'inline';
    edit.style.display = 'none';
    edit.contentEditable = false;
    save.style.display = cancel.style.display = 'none';
    rename.style.display = 'inline-block';
  }

  _handleKeyPress(e, edit) {
    if (e.key === 'Enter') e.preventDefault(), edit.closest('.map-item').querySelector('.save-rename-btn').click();
    else if (e.key === 'Escape') e.preventDefault(), edit.closest('.map-item').querySelector('.cancel-rename-btn').click();
  }

  _makeDropTarget(el, targetMapId, parentMapId) {
    el.addEventListener("dragover", e => e.preventDefault());
    el.addEventListener("drop", async e => {
      e.preventDefault();
      const dropped = JSON.parse(e.dataTransfer.getData("application/json"));
      if (dropped.type === "map" && dropped.id === targetMapId) return;
      await this.api.moveChild(targetMapId, parentMapId, dropped.id, dropped.type);
      this.pageLoader.loadMap(parentMapId || targetMapId);
    });
  }

  _makeDraggable(el, data) {
    el.setAttribute("draggable", "true");
    el.addEventListener("dragstart", e => {
      e.dataTransfer.setData("application/json", JSON.stringify(data));
      e.dataTransfer.effectAllowed = "move";
    });
  }

  _setupDeleteHandlers(container, parentMapId) {
    container.querySelectorAll(".delete-map-btn").forEach(btn =>
      btn.addEventListener("click", async e => {
        e.stopPropagation();
        const mapId = btn.dataset.mapid;
        if (!confirm("Are you sure you want to delete this map?")) return;
        const res = await this.api.deleteMap(mapId);
        if (res.success) {
          alert("Map deleted successfully!");
          this.pageLoader.loadMap(parentMapId);
        } else alert("Failed: " + res.message);
      })
    );
  }
}

class MapManager {
  constructor(pageLoader) {
    this.api = new MapAPI();
    this.ui = new MapUI(this.api, pageLoader);
  }

  render(container, data, currentMapId) {
    this.ui.render(container, data, currentMapId);
  }
}

class HistoryManager {
  constructor(initialState) {
    this.backStack = [];
    this.forwardStack = [];
    this.current = initialState;
    this.maxSize = 50;
    this.onStateChange = null;

    // --- Integrate with browser history ---
    // Push initial state to browser history
    window.history.replaceState(this.current, '', this._makeUrl(this.current));

    // Listen for browser navigation (Back/Forward)
    window.addEventListener('popstate', (event) => {
      const state = event.state;
      if (!state) return;
      this._syncFromBrowser(state);
    });
  }

  // Create readable URL fragment like "#type-id" or "?type=page&id=123"
  _makeUrl({ id, type }) {
    if (id == null || type == null) return window.location.pathname;
    return `${window.location.pathname}?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`;
  }

  _syncFromBrowser(state) {
    // Called when browser back/forward is pressed
    this.current = state;
    this.notifyStateChange();
  }

  push(id, type) {
    if (this.current.id !== id || this.current.type !== type) {
      this.backStack.push(this.current);
      this.forwardStack = [];

      if (this.backStack.length > this.maxSize) {
        this.backStack.shift();
      }

      this.current = { id, type };
      this.notifyStateChange();

      // --- Sync to browser history ---
      window.history.pushState(this.current, '', this._makeUrl(this.current));
    }
    return this.current;
  }

  back() {
    if (this.backStack.length === 0) return null;

    this.forwardStack.push(this.current);
    this.current = this.backStack.pop();
    this.notifyStateChange();

    // --- Sync to browser ---
    window.history.pushState(this.current, '', this._makeUrl(this.current));

    return this.current;
  }

  forward() {
    if (this.forwardStack.length === 0) return null;

    this.backStack.push(this.current);
    this.current = this.forwardStack.pop();
    this.notifyStateChange();

    // --- Sync to browser ---
    window.history.pushState(this.current, '', this._makeUrl(this.current));

    return this.current;
  }

  remove(id, type) {
    const match = (item) => item.id === id && item.type === type;

    this.backStack = this.backStack.filter(item => !match(item));
    this.forwardStack = this.forwardStack.filter(item => !match(item));

    if (match(this.current)) {
      this.current = this.backStack.length > 0
        ? this.backStack[this.backStack.length - 1]
        : this.forwardStack.length > 0
          ? this.forwardStack[this.forwardStack.length - 1]
          : { id: null, type: null };

      // Sync removed state
      window.history.replaceState(this.current, '', this._makeUrl(this.current));
    }

    this.notifyStateChange();
  }

  getCurrent() { return this.current; }

  canGoBack() { return this.backStack.length > 0; }

  canGoForward() { return this.forwardStack.length > 0; }

  setStateChangeCallback(callback) { this.onStateChange = callback; }

  notifyStateChange() {
    if (this.onStateChange) {
      this.onStateChange(this.current);
    }
  }
}


class PageManager {
  constructor(history) {
    this.history = history;
    this.contentContainer = document.getElementById("content-container");
    this.mapManager = new MapManager(this);
  }

  loadByType(id, type) {
    type === 'map' ? this.loadMap(id) : this.loadPage(id);
  }

  toggleContentEditable() {
    const container = document.getElementById("page-content");
    if (container.contentEditable === "inherit") {
      container.contentEditable = "false";
    }
    container.contentEditable = container.contentEditable === "true" ? "false" : "true";
    document.getElementById("page-edit-btn").innerHTML = container.contentEditable === "true" 
      ? '<i class="bi bi-check2-square"></i> SAVE' 
      : '<i class="bi bi-pencil-square"></i> EDIT';
    if (container.contentEditable === "false") {
      const content = container.innerHTML;
      const id = this.history.getCurrent().id;
      const token = get_CSRF();
      fetch(`/api/page/${id}/update`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        ...(token ? { "X-CSRF-Token": token } : {})
      },
      body: JSON.stringify({ content })
      });
    }
  }

 // --- MODIFIED loadMap() ---
  loadMap(id) {
    fetch(`/api/map/${id}/children`)
      .then(res => res.json())
      .then(data => {
        this.history.push(id, 'map');
        const container = document.getElementById("content-container");
        this.mapManager.render(container, data, id);
      });
  }

  loadPage(id) {
    fetch(`/api/page/${id}`)
      .then(res => res.json())
      .then(data => {
        this.history.push(id, 'page');
        const container = this.contentContainer;

        container.innerHTML = `
          <div class="mb-4 border-bottom border-info pb-2">
            <h2 class="fw-bold text-info"><i class="bi bi-journal-richtext"></i> ${capitalize(data.content.title)}</h2>
          </div>
          <div id="page-content" class="text-light bg-dark p-3 rounded shadow">
            ${data.content.html}
          </div>`;
      });
  }
}


class ModalAPI {
  async addKeywords(pageId, keywords) {
    return  fetch(`/api/page/${pageId}/keywords`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords })
    });
  }

  async addExistingPage(parentMapId, pageId) {
    return  fetch(`/api/map/${parentMapId}/child`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ child_id: pageId, type: 0 })
    });
  }

  async createPage(title, content, parentMapId) {
    const res = await  fetch(`/api/page`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, parent_map_id: parentMapId, keywords: [] })
    });
    return res.json();
  }

  async createMap(title, parentMapId) {
    const res = await  fetch(`/api/map`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, parent_map_id: parentMapId })
    });
    return res.json();
  }
}

class ModalUI {
  constructor(api, pageManager, history) {
    this.api = api;
    this.pageManager = pageManager;
    this.history = history;
  }

  getKeywords() {
    const input = document.getElementById("keyword-input").value;
    return input.split(",").map(k => k.trim()).filter(Boolean);
  }

  clearKeywordInput() {
    document.getElementById("keyword-input").value = "";
  }

  hideModal(id) {
    bootstrap.Modal.getInstance(document.getElementById(id)).hide();
  }

  getNewPageData() {
    return {
      title: document.getElementById("new-page-title").value.trim(),
      content: document.getElementById("new-page-content").value
    };
  }

  clearNewPageInputs() {
    document.getElementById("new-page-title").value = "";
    document.getElementById("new-page-content").value = "";
  }

  getNewMapTitle() {
    return document.getElementById("new-map-title").value.trim();
  }

  clearNewMapInput() {
    document.getElementById("new-map-title").value = "";
  }

  getSelectedExistingPages() {
    const searchManager = app.searchManager;
    const ids = Array.from(searchManager.selectedPageIds);
    searchManager.selectedPageIds.clear();
    return ids;
  }

  async handleKeywordSubmit() {
    const keywords = this.getKeywords();
    if (!keywords.length) return;

    const current = this.history.getCurrent();
    await this.api.addKeywords(current.id, keywords);
    this.clearKeywordInput();
    this.hideModal("addKeywordModal");
  }

  async handleExistingPagesSubmit() {
    const ids = this.getSelectedExistingPages();
    if (!ids.length) return;

    const current = this.history.getCurrent();
    for (const pid of ids) {
      await this.api.addExistingPage(current.id, pid);
    }
    this.hideModal("addExistingPageModal");
    this.pageManager.loadMap(current.id);
  }

  async handleNewPageSubmit() {
    const { title, content } = this.getNewPageData();
    if (!title || !content) return;

    const current = this.history.getCurrent();
    await this.api.createPage(title, content, current.id);

    this.clearNewPageInputs();
    this.hideModal("createPageModal");
    this.pageManager.loadMap(current.id);
  }

  async handleNewMapSubmit() {
    const title = this.getNewMapTitle();
    if (!title) return;

    const current = this.history.getCurrent();
    await this.api.createMap(title, current.id);

    this.clearNewMapInput();
    this.hideModal("createMapModal");
    this.pageManager.loadMap(current.id);
  }
}

class ModalManager {
  constructor(history, pageManager) {
    this.api = new ModalAPI();
    this.ui = new ModalUI(this.api, pageManager, history);
    this.history = history;
    this.pageManager = pageManager;

    // Keep global window hooks the same
    window.submitKeywords = this.submitKeywords.bind(this);
    window.submitExistingPages = this.submitExistingPages.bind(this);
    window.submitNewPage = this.submitNewPage.bind(this);
    window.submitNewMap = this.submitNewMap.bind(this);
  }

  async submitKeywords() {
    await this.ui.handleKeywordSubmit();
  }

  async submitExistingPages() {
    await this.ui.handleExistingPagesSubmit();
  }

  async submitNewPage() {
    await this.ui.handleNewPageSubmit();
  }

  async submitNewMap() {
    await this.ui.handleNewMapSubmit();
  }
}

class SearchManager {
  constructor(history) {
    this.history = history;
    this.selectedPageIds = new Set();
  }

  getPopularPages(limit = 15) {
    const container = document.getElementById("content-container");
    return fetch(`/api/page/fromWeb`)
        .then(res => res.json())
        .then(data => {
            container.innerHTML = `<div class="mb-3"> 
  <h4 class="text-warning"><i class="bi bi-star-fill"></i> Popular Pages</h4>
  <ul class="list-group shadow">
    ${Object.keys(data).map((src) => {
      const value = data[src];
      const siteName = src.replace(/^https?:\/\//, '').replace(/\.com|\.org|\.net|\.in/g, '').replace(/\/$/, '');

      return `
        <li class="list-group-item bg-dark text-light border-secondary">
          <strong class="text-info">🌐 ${siteName}</strong>
          <ul class="list-group list-group-flush mt-2">
            ${value.flatMap(e => e.content.map(item => `
              <li class="list-group-item bg-dark text-light border-secondary ps-4">
                <a class="link-info" href="${item.href}" target="_blank">📄 ${item.text}</a>
              </li>
            `)).join('')}
          </ul>
        </li>
      `;
    }).join('')}
  </ul>
</div>`;

        }).then(() => {

            fetch(`/api/page/popular?limit=${limit}`)
                .then(res => res.json())
                .then(results => {

                    container.innerHTML += `
          <div class="mb-3">
            <h4 class="text-warning"><i class="bi bi-star-fill"></i> Popular Pages</h4>
            <ul class='list-group shadow'>
              ${results.map(p => `
                <li class='list-group-item bg-dark text-light border-secondary'>
                  <a class='link-info' href='#' onclick='app.pageManager.loadPage(${p.id})'>📄 ${p.title}</a>
                </li>`).join('')}
            </ul>
          </div>`;
                })
        })
  }

  getDiscoverPages(limit = 15) {
    return fetch(`/api/page/discover?limit=${limit}`)
      .then(res => res.json())
      .then(results => {
        const container = document.getElementById("content-container");
        container.innerHTML = `
          <div class="mb-3">
            <h4 class="text-primary"><i class="bi bi-compass"></i> Discover Pages</h4>
            <ul class='list-group shadow'>
              ${results.map(p => `
                <li class='list-group-item bg-dark text-light border-secondary'>
                  <a class='link-info' href='#' onclick='app.pageManager.loadPage(${p.id})'>📄 ${p.title}</a>
                </li>`).join('')}
            </ul>
          </div>`;
      });
  }

  searchQuery(query) {
    fetch(`/api/page/search?q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(results => {
        const container = document.getElementById("content-container");
        container.innerHTML = `
          <div class="mb-3">
            <h4 class="text-success"><i class="bi bi-search"></i> Search Results for "${query}"</h4>
            <ul class='list-group shadow'>
              ${results.map(p => `
                <li class='list-group-item bg-dark text-light border-secondary'>
                  <a class='link-info' href='#' onclick='app.pageManager.loadPage(${p.id})'>📄 ${p.title}</a>
                </li>`).join('')}
            </ul>
          </div>`;
      });
  }

  searchPages(query) {
    if (!query) return;

    fetch(`/api/page/search?q=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(results => {
        const container = document.getElementById("existing-page-results");

        container.innerHTML = results.map(p => {
          const checked = this.selectedPageIds.has(p.id) ? "checked" : "";
          return `
            <div class='form-check text-light bg-dark border-bottom border-secondary p-2 rounded'>
              <input class='form-check-input' type='checkbox' value='${p.id}' id='page-${p.id}' ${checked}>
              <label class='form-check-label' for='page-${p.id}'>${p.title}</label>
            </div>`;
        }).join('');

        results.forEach(p => {
          const checkbox = document.getElementById(`page-${p.id}`);
          checkbox.onchange = () => {
            checkbox.checked ? this.selectedPageIds.add(p.id) : this.selectedPageIds.delete(p.id);
          };
        });
      });
  }
}

class AppEventBinder {
  constructor(appController) {
    this.app = appController;
  }

  bindAll() {
    this.bindNavigation();
    this.bindSearch();
    this.bindDiscoverButtons();
    this.bindExistingPageSearch();
    this.bindPageButtons();
    this.bindHistoryControls();
  }

  bindNavigation() {
    document.getElementById("home-link").onclick = () => this.app.pageManager.loadMap(1);
  }

  bindSearch() {
    document.getElementById("search-bar").addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.app.searchManager.searchQuery(e.target.value);
    });
  }

  bindDiscoverButtons() {
    document.getElementById("discover-btn").onclick = () => this.app.searchManager.getDiscoverPages();
    document.getElementById("popular-btn").onclick = () => this.app.searchManager.getPopularPages();
  }

  bindExistingPageSearch() {
    document.getElementById("existing-page-search").addEventListener("input", (e) => {
      this.app.searchManager.searchPages(e.target.value);
    });
  }

  bindHistoryControls() {
    const { history, pageManager } = this.app;

    document.getElementById("back-btn").onclick = () => history.back();
    document.getElementById("forward-btn").onclick = () => history.forward();

    history.setStateChangeCallback((state) => {
      pageManager.loadByType(state.id, state.type);
      this.app.updateNavButtons();
      this.app.updateOptions();
    });
  }

  bindPageButtons() {
    const { pageManager, history } = this.app;

    document.getElementById("page-edit-btn").onclick = () => pageManager.toggleContentEditable();
    document.getElementById("latex-cleaner-btn").onclick = () => latexCleaning(document.getElementById("page-content"));

    const deleteBtn = document.getElementById("page-delete-btn");
    const confirmModalEl = document.getElementById("confirmDeleteModal");
    const confirmDeleteBtn = document.getElementById("confirm-delete-btn");
    const confirmModal = new bootstrap.Modal(confirmModalEl);

    deleteBtn.onclick = () => {
      confirmModal.show();
      confirmDeleteBtn.onclick = () => {
        let id = history.getCurrent().id;
        let url = `/page/${id}/delete`;

        let onSuccess = () => {
          history.back();
          history.remove(id, "page");
          confirmModal.hide();
        };

        RequestDelete(url, onSuccess, () => confirmModal.hide());
      };
    };
  }
}

class AppController {
  constructor(initialState) {
    this.history = new HistoryManager(initialState);
    this.pageManager = new PageManager(this.history);
    this.searchManager = new SearchManager(this.history);
    this.modalManager = new ModalManager(this.history, this.pageManager);

    this.eventBinder = new AppEventBinder(this);

    window.onload = () => this.initialize();
  }

  initialize() {
    this.eventBinder.bindAll();  // Delegate all DOM event setup
    this.pageManager.loadByType(this.history.current.id,this.history.current.type);
    this.updateOptions();
  }

  updateNavButtons() {
    document.getElementById("back-btn").disabled = !this.history.canGoBack();
    document.getElementById("forward-btn").disabled = !this.history.canGoForward();
  }

  updateOptions() {
    const current = this.history.getCurrent();
    document.getElementById("map-options").classList.toggle("d-none", current.type !== 'map');
    document.getElementById("page-options").classList.toggle("d-none", current.type !== 'page');
  }
}





