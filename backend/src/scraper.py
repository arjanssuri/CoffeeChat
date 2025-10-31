import os
import requests
import re
import logging
from typing import Dict, List, Optional
from models import ScrapedOrgData, OrgType

logger = logging.getLogger(__name__)

class OrganizationScraper:
    def __init__(self):
        self.firecrawl_api_key = os.getenv('FIRECRAWL_API_KEY')
        if not self.firecrawl_api_key:
            raise ValueError("FIRECRAWL_API_KEY environment variable is required")

    async def scrape_organization(self, url: str) -> ScrapedOrgData:
        """
        Scrape organization data from a given URL using Firecrawl
        """
        try:
            # Use Firecrawl to scrape the website
            response = requests.post(
                'https://api.firecrawl.dev/v0/scrape',
                headers={
                    'Authorization': f'Bearer {self.firecrawl_api_key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'url': url,
                    'pageOptions': {
                        'onlyMainContent': True,
                        'includeHtml': True
                    },
                    'extractorOptions': {
                        'extractionSchema': {
                            'type': 'object',
                            'properties': {
                                'organization_name': {
                                    'type': 'string',
                                    'description': 'The name of the organization'
                                },
                                'description': {
                                    'type': 'string',
                                    'description': 'Description or mission of the organization'
                                },
                                'contact_email': {
                                    'type': 'string',
                                    'description': 'Contact email for the organization'
                                },
                                'application_requirements': {
                                    'type': 'string',
                                    'description': 'Requirements to join or apply to the organization'
                                },
                                'application_deadline': {
                                    'type': 'string',
                                    'description': 'Application deadline if mentioned'
                                }
                            }
                        }
                    }
                }
            )

            if response.status_code != 200:
                raise Exception(f"Firecrawl API error: {response.status_code} - {response.text}")

            data = response.json()

            # Extract content
            content = data.get('data', {}).get('content', '')
            html = data.get('data', {}).get('html', '')
            extracted_data = data.get('data', {}).get('extract', {})

            # Use extracted data if available, otherwise parse content
            org_name = extracted_data.get('organization_name') or self._extract_name_from_content(content, html)
            description = extracted_data.get('description') or self._extract_description(content)
            contact_email = extracted_data.get('contact_email') or self._extract_email(content)
            requirements = extracted_data.get('application_requirements') or self._extract_requirements(content)
            deadline = extracted_data.get('application_deadline') or self._extract_deadline(content)

            # Determine organization type
            org_type = self._determine_org_type(content, org_name)

            return ScrapedOrgData(
                name=org_name or "Unknown Organization",
                description=description,
                type=org_type,
                contact_email=contact_email,
                application_requirements=requirements,
                application_deadline=deadline
            )

        except Exception as e:
            logger.error(f"Failed to scrape {url}: {e}")
            raise Exception(f"Scraping failed: {str(e)}")

    def _extract_name_from_content(self, content: str, html: str) -> Optional[str]:
        """Extract organization name from content and HTML"""
        # Try to get from title tag first
        title_match = re.search(r'<title>([^<]+)</title>', html, re.IGNORECASE)
        if title_match:
            title = title_match.group(1).strip()
            # Clean up common suffixes
            title = re.sub(r'\s*[-|–]\s*(Home|Welcome|Official Site).*$', '', title, flags=re.IGNORECASE)
            if len(title) > 3:
                return title

        # Try to extract from headers in content
        lines = content.split('\n')
        for line in lines[:10]:  # Check first 10 lines
            line = line.strip()
            # Clean up markdown headers and extra characters
            line = re.sub(r'^#+\s*', '', line)  # Remove markdown headers
            line = re.sub(r'^[*\-#\s]+', '', line)  # Remove bullets, dashes, hashes
            line = line.strip()
            if len(line) > 3 and len(line) < 100:
                return line

        return None

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