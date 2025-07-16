class History {
  constructor(initialState) {
    this.backStack = [];
    this.forwardStack = [];
    this.current = initialState;
    this.maxSize = 50;
    this.onStateChange = null; // Callback for state changes
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
    }
    return this.current;
  }

  back() {
    if (this.backStack.length === 0) return null;
    
    this.forwardStack.push(this.current);
    this.current = this.backStack.pop();
    this.notifyStateChange();
    return this.current;
  }

  forward() {
    if (this.forwardStack.length === 0) return null;
    
    this.backStack.push(this.current);
    this.current = this.forwardStack.pop();
    this.notifyStateChange();
    return this.current;
  }

  getCurrent() {
    return this.current;
  }

  canGoBack() {
    return this.backStack.length > 0;
  }

  canGoForward() {
    return this.forwardStack.length > 0;
  }

  setStateChangeCallback(callback) {
    this.onStateChange = callback;
  }

  notifyStateChange() {
    if (this.onStateChange) {
      this.onStateChange(this.current);
    }
  }
}
class PageManager {
  constructor(history) {
    this.history = history;
  }

  loadByType(id, type) {
    type === 'map' ? this.loadMap(id) : this.loadPage(id);
  }

  loadMap(id) {
    fetch(`/map/${id}/children`)
      .then(res => res.json())
      .then(data => {
        this.history.push(id, 'map');
        const container = document.getElementById("content-container");

        container.innerHTML = `
          <div class="text-neon mb-4">
            <h3><i class="bi bi-diagram-3"></i> Sub Maps</h3>
            <ul class="list-group shadow">
              ${data.maps.map(m => `
                <li class='list-group-item bg-dark text-light border-secondary'>
                  <a class='link-warning' href='#' onclick='app.pageManager.loadMap(${m.id})'>🗺️ ${m.title}</a>
                </li>`).join('')}
            </ul>
          </div>
          <div class="text-neon">
            <h3><i class="bi bi-file-earmark-text"></i> Pages</h3>
            <ul class="list-group shadow">
              ${data.pages.map(p => `
                <li class='list-group-item bg-dark text-light border-secondary'>
                  <a class='link-info' href='#' onclick='app.pageManager.loadPage(${p.id})'>📄 ${p.title}</a>
                </li>`).join('')}
            </ul>
          </div>`;
      });
  }

  loadPage(id) {
    fetch(`/page/${id}`)
      .then(res => res.json())
      .then(data => {
        this.history.push(id, 'page');
        const container = document.getElementById("content-container");

        container.innerHTML = `
          <div class="mb-4 border-bottom border-info pb-2">
            <h2 class="fw-bold text-info"><i class="bi bi-journal-richtext"></i> ${data.content.title}</h2>
          </div>
          <div class="text-light bg-dark p-3 rounded shadow">
            ${data.content.html}
          </div>`;
      });
  }
}


class ModalManager {
  constructor(history, pageManager) {
    this.history = history;
    this.pageManager = pageManager;

    // Attach to window for HTML event hooks if needed
    window.submitKeywords = this.submitKeywords.bind(this);
    window.submitExistingPages = this.submitExistingPages.bind(this);
    window.submitNewPage = this.submitNewPage.bind(this);
    window.submitNewMap = this.submitNewMap.bind(this);
  }

  submitKeywords() {
    const input = document.getElementById("keyword-input").value;
    const keywords = input.split(",").map(k => k.trim()).filter(k => k);
    const current = this.history.getCurrent();
    if (!keywords.length) return;

    fetch(`/page/${current.id}/keywords`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords })
    }).then(() => {
      document.getElementById("keyword-input").value = "";
      bootstrap.Modal.getInstance(document.getElementById("addKeywordModal")).hide();
    });
  }

  submitExistingPages() {
    const searchManager = app.searchManager; // access selectedPageIds
    const ids = Array.from(searchManager.selectedPageIds);
    if (!ids.length) return;
    const current = this.history.getCurrent();

    ids.forEach(pid => {
      fetch(`/map/${current.id}/child`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ child_id: pid, type: 0 })
      });
    });

    searchManager.selectedPageIds.clear();
    bootstrap.Modal.getInstance(document.getElementById("addExistingPageModal")).hide();
    this.pageManager.loadMap(current.id);
  }

  submitNewPage() {
    const title = document.getElementById("new-page-title").value.trim();
    const content = document.getElementById("new-page-content").value;
    const current = this.history.getCurrent();
    if (!title || !content) return;

    fetch(`/page`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, parent_map_id: current.id, keywords: [] })
    })
    .then(res => res.json())
    .then(() => {
      document.getElementById("new-page-title").value = "";
      document.getElementById("new-page-content").value = "";
      bootstrap.Modal.getInstance(document.getElementById("createPageModal")).hide();
      this.pageManager.loadMap(current.id);
    });
  }

  submitNewMap() {
    const title = document.getElementById("new-map-title").value.trim();
    if (!title) return;
    const current = this.history.getCurrent();

    fetch(`/map`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, parent_map_id: current.id })
    })
    .then(res => res.json())
    .then(() => {
      document.getElementById("new-map-title").value = "";
      bootstrap.Modal.getInstance(document.getElementById("createMapModal")).hide();
      this.pageManager.loadMap(current.id);
    });
  }
}

class SearchManager {
  constructor(history) {
    this.history = history;
    this.selectedPageIds = new Set();
  }

  searchQuery(query) {
    fetch(`/page/search?q=${encodeURIComponent(query)}`)
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

    fetch(`/page/search?q=${encodeURIComponent(query)}`)
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

class AppController {
  constructor() {
    this.history = new History({ id: 1, type: 'map' });
    this.pageManager = new PageManager(this.history);
    this.searchManager = new SearchManager(this.history);
    this.modalManager = new ModalManager(this.history, this.pageManager);

    window.onload = () => this.initialize();
  }

  initialize() {
    document.getElementById("home-link").onclick = () => this.pageManager.loadMap(1);

    document.getElementById("search-bar").addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.searchManager.searchQuery(e.target.value);
    });

    document.getElementById("back-btn").onclick = () => this.history.back();
    document.getElementById("forward-btn").onclick = () => this.history.forward();

    document.getElementById("existing-page-search").addEventListener("input", (e) => {
      this.searchManager.searchPages(e.target.value);
    });

    this.history.setStateChangeCallback((state) => {
      this.pageManager.loadByType(state.id, state.type);
      this.updateNavButtons();
      this.updateOptions();
    });

    this.pageManager.loadMap(1);
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

// Declare globally so HTML inline handlers can access
const app = new AppController();

