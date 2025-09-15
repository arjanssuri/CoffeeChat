from playwright.async_api import async_playwright
import re
import logging
from typing import Dict, List, Optional
from models import ScrapedOrgData, OrgType

logger = logging.getLogger(__name__)

class OrganizationScraper:
    def __init__(self):
        self.results = []

    async def scrape_organization(self, url: str) -> ScrapedOrgData:
        """
        Scrape organization data from a given URL
        """
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()

                # Navigate to the main page
                await page.goto(url, wait_until="networkidle")
                html = await page.content()
                text = await page.inner_text("body")
                clean_text = text.replace("\n", " ")

                # Extract sublinks for additional scraping
                crawled_urls = self._extract_internal_links(html, url)

                # Scrape additional pages for more context
                additional_content = []
                for i, sub_url in enumerate(crawled_urls[:3]):  # Limit to 3 subpages
                    try:
                        await page.goto(sub_url, wait_until="networkidle")
                        sub_text = await page.inner_text("body")
                        additional_content.append(sub_text.replace("\n", " "))
                    except Exception as e:
                        logger.warning(f"Failed to scrape {sub_url}: {e}")

                await browser.close()

                # Combine all content
                full_content = clean_text + " " + " ".join(additional_content)

                # Extract organization data
                org_data = self._extract_org_data(full_content, url)

                return org_data

        except Exception as e:
            logger.error(f"Failed to scrape {url}: {e}")
            raise Exception(f"Scraping failed: {str(e)}")

    def _extract_internal_links(self, html: str, base_url: str) -> List[str]:
        """Extract internal links from HTML"""
        pattern = re.compile(
            r'<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|\'([^\']*)\'|([^\s>]+))',
            re.IGNORECASE
        )

        crawled_urls = set()
        for m in pattern.finditer(html):
            if m.groups() and m.groups()[0]:
                url = m.groups()[0]
                if url.startswith("/"):
                    processed_url = base_url.rstrip("/") + url
                    crawled_urls.add(processed_url)

        return list(crawled_urls)

    def _extract_org_data(self, content: str, url: str) -> ScrapedOrgData:
        """Extract organization data from scraped content using pattern matching"""

        # Extract organization name (try to get from title or headers)
        name_patterns = [
            r'<title>([^<]+)</title>',
            r'<h1[^>]*>([^<]+)</h1>',
            r'<h2[^>]*>([^<]+)</h2>'
        ]

        name = "Unknown Organization"
        for pattern in name_patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                name = match.group(1).strip()
                break

        # Clean up common suffixes from titles
        name = re.sub(r'\s*[-|–]\s*(Home|Welcome|Official Site).*$', '', name, flags=re.IGNORECASE)

        # Extract description (look for about/description sections)
        description = self._extract_description(content)

        # Extract contact email
        email = self._extract_email(content)

        # Determine organization type based on content
        org_type = self._determine_org_type(content, name)

        # Extract application requirements
        requirements = self._extract_requirements(content)

        # Extract application deadline
        deadline = self._extract_deadline(content)

        return ScrapedOrgData(
            name=name,
            description=description,
            type=org_type,
            contact_email=email,
            application_requirements=requirements,
            application_deadline=deadline
        )

    def _extract_description(self, content: str) -> Optional[str]:
        """Extract organization description"""
        # Look for common description patterns
        patterns = [
            r'(?:about|description|mission|purpose)[^.]*?([^.]{50,200}\.)',
            r'<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']+)["\']',
            r'(?:we are|we\'re|our mission|our purpose)[^.]*?([^.]{30,150}\.)'
        ]

        for pattern in patterns:
            match = re.search(pattern, content, re.IGNORECASE | re.DOTALL)
            if match:
                description = match.group(1).strip()
                # Clean up HTML tags and extra whitespace
                description = re.sub(r'<[^>]+>', '', description)
                description = re.sub(r'\s+', ' ', description)
                if len(description) > 20:  # Only return if substantial
                    return description

        return None

    def _extract_email(self, content: str) -> Optional[str]:
        """Extract contact email"""
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        matches = re.findall(email_pattern, content)

        # Filter out common non-contact emails
        filtered_emails = [
            email for email in matches
            if not any(skip in email.lower() for skip in ['noreply', 'no-reply', 'privacy', 'legal'])
        ]

        return filtered_emails[0] if filtered_emails else None

    def _determine_org_type(self, content: str, name: str) -> OrgType:
        """Determine organization type based on content and name"""
        content_lower = content.lower()
        name_lower = name.lower()

        # Define keywords for each type
        type_keywords = {
            OrgType.FRATERNITY: ['fraternity', 'frat', 'brotherhood', 'alpha', 'beta', 'gamma', 'delta', 'sigma', 'phi', 'psi'],
            OrgType.SORORITY: ['sorority', 'sisterhood', 'alpha', 'beta', 'gamma', 'delta', 'sigma', 'phi', 'psi'],
            OrgType.PROFESSIONAL: ['professional', 'career', 'industry', 'business', 'consulting', 'finance', 'tech', 'engineering'],
            OrgType.ACADEMIC: ['academic', 'honor', 'research', 'study', 'scholar', 'education'],
            OrgType.SERVICE: ['service', 'volunteer', 'community', 'charity', 'outreach', 'giving'],
            OrgType.RECREATIONAL: ['recreational', 'sports', 'fitness', 'gaming', 'hobby', 'outdoor'],
            OrgType.RELIGIOUS: ['religious', 'faith', 'christian', 'muslim', 'jewish', 'hindu', 'buddhist', 'spiritual'],
            OrgType.CULTURAL: ['cultural', 'heritage', 'ethnic', 'international', 'diversity', 'multicultural']
        }

        # Check name and content for type indicators
        for org_type, keywords in type_keywords.items():
            if any(keyword in name_lower or keyword in content_lower for keyword in keywords):
                return org_type

        return OrgType.CLUB  # Default to club

    def _extract_requirements(self, content: str) -> Optional[str]:
        """Extract application requirements"""
        patterns = [
            r'(?:requirements|qualifications|eligibility)[^.]*?([^.]{20,200}\.)',
            r'(?:to apply|application)[^.]*?(?:must|need|require)[^.]*?([^.]{20,150}\.)'
        ]

        for pattern in patterns:
            match = re.search(pattern, content, re.IGNORECASE | re.DOTALL)
            if match:
                requirements = match.group(1).strip()
                requirements = re.sub(r'<[^>]+>', '', requirements)
                requirements = re.sub(r'\s+', ' ', requirements)
                return requirements

        return None

    def _extract_deadline(self, content: str) -> Optional[str]:
        """Extract application deadline"""
        # Look for date patterns near deadline keywords
        deadline_pattern = r'(?:deadline|due|apply by)[^.]*?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\w+ \d{1,2},? \d{4})'
        match = re.search(deadline_pattern, content, re.IGNORECASE)

        if match:
            return match.group(1).strip()

        return None