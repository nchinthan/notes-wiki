from .scraping import BrowserAutomation
import json,time

fp = open('scraping/websites.json', 'r')
websites = json.load(fp)
fp.close()
browser = None 

def init_browser(headless=True):
    global browser
    if browser is None:
        browser = BrowserAutomation(headless=headless)

def close_browser():
    global browser
    if browser:
        browser.close()
        browser = None

def update_json_file():
    """Update the JSON file with the current websites data."""
    with open('scraping/websites.json', 'w') as f:
        json.dump(websites, f, indent=4)

def add_website(url:str,args:list[dict]):
    """
    args : list of dict of :  jspath , values , tag , attribute
    """  
    if not args or not all("JsPath" in item and "tag" in item and "attribute" in item for item in args):
        raise ValueError("Arguments must include 'JsPath', 'tag', and 'attribute'.")
    websites[url] = args
    update_json_file()

def process_website(url:str,_skip_save=False):
    """
    Process a website by scraping its content based on the provided selectors.
    """
    if url not in websites:
        raise ValueError(f"Website {url} not found in the configuration.")
    
    args = websites[url]
    browser.open_url(url)
    for e,i in enumerate(args):
        websites[url][e]["content"] = browser.selector(i['JsPath'], i['tag'], [i.get('attribute')])
        websites[url][e]["timestamp"] = time.time()
    if not _skip_save:
        update_json_file()

def routine_update():
    for url in websites:
        timestamp = websites[url][0].get("timestamp", 0)
        if  time.time() - timestamp < 86400:  # 24 hours
            continue
        print(f"Updating {url}...")
        try:
            process_website(url, _skip_save=True)
        except ValueError as e:
            print(f"Error processing {url}: {e}")
    update_json_file()

if __name__ == "__main__":
    
    browser.close()