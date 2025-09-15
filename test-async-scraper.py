#!/usr/bin/env python3
import asyncio
import sys
import os

# Add src directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend', 'src'))

from scraper import OrganizationScraper

async def test_scraper():
    scraper = OrganizationScraper()
    try:
        result = await scraper.scrape_organization("https://tpeo.org")
        print(f"✅ Scraping successful!")
        print(f"Name: {result.name}")
        print(f"Type: {result.type}")
        print(f"Description: {result.description}")
    except Exception as e:
        print(f"❌ Scraping failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_scraper())