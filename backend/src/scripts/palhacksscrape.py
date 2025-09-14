from playwright.sync_api import sync_playwright
from html.parser import HTMLParser
import re

def process(URL):
    #URL = "https://txproduct.org/"

    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(URL,wait_until="networkidle") #waits for js to finish loading
        html = page.content()
        text = page.inner_text("body")
        clean_text = text.replace("\n", " ")
        results.append(clean_text)
        browser.close()

    pattern = re.compile(
        r'<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|\'([^\']*)\'|([^\s>]+))',
        re.IGNORECASE
    )

    crawled_urls = set()

    for m in pattern.finditer(html):
        #print(m.groups())

        if (m.groups() and m.groups()[0]):
            processed_url = None
            url = m.groups()[0]
            if (url[0] == "/"):
                processed_url = url[1:]
            if (processed_url):
                #print(processed_url)
                crawled_urls.add(processed_url)
            #print(m.groups()[0])
        #print(m.start(), next(g for g in m.groups() if g))

    #print(crawled_urls)
    crawled_urls = list(crawled_urls)
    expanded_urls = [URL]
    for url in crawled_urls:
        expanded_urls.append(URL+url)
    print(expanded_urls)

    #first value in the expanded urls is the one we visited in default.
    #scrape all other sublinks for info as well





    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        #max of 5 links to scrape to avoid crazy wait times
        for i in range(1, min(5,len(expanded_urls))):
            link_to_scrape = expanded_urls[i]
            try:
                page.goto(link_to_scrape,wait_until="networkidle") #waits for js to finish loading
                html = page.content()
                text = page.inner_text("body")
                clean_text = text.replace("\n", " ")
                results.append(clean_text)
            except Exception as e:
                print(f"Failed {link_to_scrape}: {e}")
        browser.close()

    with open("./scraped_results.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(results))

    print("Results exported to scraped_results.txt")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--out", default="scraped_results.txt")
    args = parser.parse_args()
    process(args.url)  # writes args.out as you already do (or pass args.out into process if you like)