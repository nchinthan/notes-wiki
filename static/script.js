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

  remove(id, type) {
    const match = (item) => item.id === id && item.type === type;

    // Filter both stacks to remove all matching entries
    this.backStack = this.backStack.filter(item => !match(item));
    this.forwardStack = this.forwardStack.filter(item => !match(item));

    // If the current matches, reset it to a safe fallback
    if (match(this.current)) {
      this.current = this.backStack.length > 0 
        ? this.backStack[this.backStack.length - 1]   // last in back
        : this.forwardStack.length > 0 
          ? this.forwardStack[this.forwardStack.length - 1] 
          : { id: null, type: null }; // empty fallback
    }

    this.notifyStateChange();
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
    this.contentContainer = document.getElementById("content-container");
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
      fetch(`/page/${id}/update`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        ...(token ? { "X-CSRF-Token": token } : {})
      },
      body: JSON.stringify({ content })
      });
    }
  }

  loadMap(id) {
    fetch(`/map/${id}/children`)
      .then(res => res.json())
      .then(data => {
        this.history.push(id, 'map');
        const container = document.getElementById("content-container");

        container.innerHTML = `
          ${data.parent_id ? `
            <div class="text-neon mb-3">
              <button class="btn btn-outline-warning btn-sm" onclick="app.pageManager.loadMap(${data.parent_id})">
                <i class="bi bi-arrow-up"></i> Back to Parent Map
              </button>
            </div>
          ` : ''}
          <div class="text-neon mb-4">
            <h3><i class="bi bi-diagram-3"></i> Sub Maps</h3>
            ${data.maps.length > 0 ? `
              <ul class="list-group shadow">
                ${data.maps.map(m => `
                  <li class='list-group-item bg-dark text-light border-secondary'>
                    <a style="text-decoration: none;cursor:pointer;" class='link-warning' onclick='app.pageManager.loadMap(${m.id})'>🗺️ ${capitalize(m.title)}</a>
                  </li>`).join('')}
              </ul>
            ` : '<p class="text-muted">No sub maps available</p>'}
          </div>
          <div class="text-neon">
            <h3><i class="bi bi-file-earmark-text"></i> Pages</h3>
            ${data.pages.length > 0 ? `
              <ul class="list-group shadow">
                ${data.pages.map(p => `
                  <li class='list-group-item bg-dark text-light border-secondary'>
                    <a style="text-decoration: none;cursor:pointer;" class='link-info' onclick='app.pageManager.loadPage(${p.id})'>📄 ${capitalize(p.title)}</a>
                  </li>`).join('')}
              </ul>
            ` : '<p class="text-muted">No pages available</p>'}
          </div>`;
      });
  }

  loadPage(id) {
    fetch(`/page/${id}`)
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
    console.log(ids)
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

  getPopularPages(limit = 15) {
    const container = document.getElementById("content-container");
    return fetch(`/page/fromWeb`)
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

            fetch(`/page/popular?limit=${limit}`)
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
    return fetch(`/page/discover?limit=${limit}`)
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

    document.getElementById("discover-btn").onclick = () => this.searchManager.getDiscoverPages();
    document.getElementById("popular-btn").onclick = () => this.searchManager.getPopularPages();

    document.getElementById("existing-page-search").addEventListener("input", (e) => {
      this.searchManager.searchPages(e.target.value);
    });

    this.initializePageButtons();

    this.initializeHistoryFunctionalities();

    this.pageManager.loadMap(1);
    this.updateOptions();
  }

  initializeHistoryFunctionalities(){
    document.getElementById("back-btn").onclick = () => this.history.back();
    document.getElementById("forward-btn").onclick = () => this.history.forward();
    this.history.setStateChangeCallback((state) => {
      this.pageManager.loadByType(state.id, state.type);
      this.updateNavButtons();
      this.updateOptions();
    });
  }

  initializePageButtons() {
    document.getElementById("page-edit-btn").onclick = () => {
      this.pageManager.toggleContentEditable();
    }
    document.getElementById("latex-cleaner-btn").onclick = () => {
      latexCleaning(document.getElementById("page-content"));
    };

    const deleteBtn = document.getElementById("page-delete-btn");
    const confirmModalEl = document.getElementById("confirmDeleteModal");
    const confirmDeleteBtn = document.getElementById("confirm-delete-btn");

    // Bootstrap modal instance
    const confirmModal = new bootstrap.Modal(confirmModalEl);

    deleteBtn.onclick = () => {
      // Show confirmation modal first
      confirmModal.show();

      // Set up confirm delete click handler (bound to this instance)
      confirmDeleteBtn.onclick = () => {
        let id = this.history.getCurrent().id;
        let url = `/page/${id}/delete`;

        let onSuccess = (d) => {
          this.history.back();
          this.history.remove(id, "page");
          confirmModal.hide();
        };

        RequestDelete(url, onSuccess, (d) => {
          confirmModal.hide();
        });
      };
    };
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

