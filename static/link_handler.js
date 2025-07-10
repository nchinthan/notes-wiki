function setEventlistenerForPageLink(dom) {
  dom.addEventListener('contextmenu', function(event) {
    const selection = window.getSelection();

    if (!selection.isCollapsed) {
      event.preventDefault();
      const selectedText = selection.toString();
      const range = selection.getRangeAt(0);

      // Wrap the selected text with a span
      const span = document.createElement('span');
      span.id = 'temp-selection-holder';
      span.className = 'bg-warning'; // optional visual cue
      range.surroundContents(span);

      // Remove existing menu if present
      const oldMenu = document.getElementById("custom-context-menu");
      if (oldMenu) oldMenu.remove();

      // Create context menu
      const menu = document.createElement("div");
      menu.id = "custom-context-menu";
      menu.style.position = "absolute";
      menu.style.top = `${event.pageY}px`;
      menu.style.left = `${event.pageX}px`;
      menu.style.background = "#fff";
      menu.style.border = "1px solid #ccc";
      menu.style.padding = "10px";
      menu.style.zIndex = 10000;
      menu.style.boxShadow = "0px 2px 10px rgba(0,0,0,0.2)";
      menu.innerHTML = `
        <div class="mb-2"><strong>Link selected text to Page ID:</strong></div>
        <input type="number" class="form-control mb-2" id="page-id-input" placeholder="Enter Page ID">
        <button class="btn btn-primary btn-sm" id="link-submit-btn">Submit</button>
      `;

      document.body.appendChild(menu);

      // Submit handler
      document.getElementById("link-submit-btn").addEventListener("click", () => {
        const pageId = document.getElementById("page-id-input").value.trim();
        if (!pageId) return alert("Please enter a valid Page ID");

        const link = document.createElement("a");
        link.href = "#";
        link.onclick = () => ContentRegion.loadPage(Number(pageId));
        link.textContent = selectedText;

        const tempSpan = document.getElementById("temp-selection-holder");
        if (tempSpan) tempSpan.replaceWith(link);

        menu.remove();
      });

      // Remove menu on outside click
      document.addEventListener("click", function outsideClickHandler(e) {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener("click", outsideClickHandler);
        }
      });
    }
  });
}
