from playwright.sync_api import sync_playwright

class BrowserAutomation:
    def __init__(self, headless=True, browser_type='chromium'):
        print("\033[94mInitializing BrowserAutomation...",end="")
        self.playwright = sync_playwright().start()
        self.browser_type = browser_type.lower()
        
        if self.browser_type == 'chromium':
            self.browser = self.playwright.chromium.launch(headless=headless)
        elif self.browser_type == 'firefox':
            self.browser = self.playwright.firefox.launch(headless=headless)
        elif self.browser_type == 'webkit':
            self.browser = self.playwright.webkit.launch(headless=headless)
        else:
            raise ValueError("Invalid browser type. Use 'chromium', 'firefox', or 'webkit'.")

        self.context = self.browser.new_context()
        self.page = self.context.new_page()

        print("done\033[0m")
        
    def open_url(self, url: str, wait_time: int = 3000):
        """Open a URL and return the page HTML content."""
        self.page.goto(url)
        self.page.wait_for_timeout(wait_time)

    def getContent(self):
        """Get the current page HTML content."""
        return self.page.content()

    def screenshot(self, path="screenshot.png"):
        """Take a screenshot of the current page."""
        self.page.screenshot(path=path)

    def selector(self, JsPath,tag,attributes:list[str]):
        tags = self.page.query_selector(JsPath).query_selector_all(tag)
        return [
            {
            **{attr: (tag.get_attribute(attr) if tag.get_attribute(attr) else 'Not Found') for attr in attributes},
            "text": tag.inner_text() if tag.inner_text() else 'Not Found'
            }
            for tag in tags
        ]

    def close(self):
        self.browser.close()
        self.playwright.stop()
