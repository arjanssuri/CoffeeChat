from typing import List, Optional, Dict
from database import get_supabase_client
from models import Organization, OrgScrapeRequest, ScrapedOrgData, ScrapeStatus, OrgType
from scraper import OrganizationScraper
import logging

logger = logging.getLogger(__name__)

class OrganizationService:
    def __init__(self):
        self.supabase = get_supabase_client()
        self.scraper = OrganizationScraper()

    async def get_organizations_by_school(self, school_id: str) -> List[Dict]:
        """Get all organizations for a specific school"""
        try:
            response = self.supabase.table("organizations").select("*").eq("school_id", school_id).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching organizations for school {school_id}: {e}")
            raise

    async def get_organization_by_id(self, org_id: str) -> Optional[Dict]:
        """Get organization by ID"""
        try:
            response = self.supabase.table("organizations").select("*").eq("id", org_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error fetching organization {org_id}: {e}")
            raise

    async def create_scrape_request(self, user_id: str, school_id: str, org_name: str, website_url: str, suggested_type: Optional[str] = None) -> Dict:
        """Create a new scrape request"""
        try:
            scrape_request = {
                "user_id": user_id,
                "school_id": school_id,
                "org_name": org_name,
                "website_url": website_url,
                "suggested_type": suggested_type,
                "status": ScrapeStatus.PENDING
            }

            response = self.supabase.table("org_scrape_requests").insert(scrape_request).execute()
            return response.data[0]
        except Exception as e:
            logger.error(f"Error creating scrape request: {e}")
            raise

    async def process_scrape_request(self, request_id: str) -> Dict:
        """Process a scrape request by scraping the organization and creating it"""
        try:
            # Get the scrape request
            request_response = self.supabase.table("org_scrape_requests").select("*").eq("id", request_id).execute()
            if not request_response.data:
                raise ValueError(f"Scrape request {request_id} not found")

            scrape_request = request_response.data[0]

            # Update status to processing
            self.supabase.table("org_scrape_requests").update({"status": ScrapeStatus.PROCESSING}).eq("id", request_id).execute()

            try:
                # Scrape the organization
                scraped_data = await self.scraper.scrape_organization(scrape_request["website_url"])

                # Use the requested name if scraper returns "Unknown Organization"
                final_name = scraped_data.name if scraped_data.name != "Unknown Organization" else scrape_request["org_name"]

                # Prepare organization data
                org_data = {
                    "school_id": scrape_request["school_id"],
                    "name": final_name,
                    "type": scraped_data.type or scrape_request.get("suggested_type", OrgType.CLUB),
                    "description": scraped_data.description,
                    "website_url": scrape_request["website_url"],
                    "contact_email": scraped_data.contact_email,
                    "application_requirements": scraped_data.application_requirements,
                    "application_deadline": scraped_data.application_deadline,
                    "is_verified": False  # Requires manual verification
                }

                # Check if organization already exists by name or website URL
                existing_response = self.supabase.table("organizations").select("*").eq("school_id", scrape_request["school_id"]).or_(f'name.eq.{final_name},website_url.eq.{scrape_request["website_url"]}').execute()

                if existing_response.data:
                    # Update existing organization
                    existing_org = existing_response.data[0]
                    org_response = self.supabase.table("organizations").update(org_data).eq("id", existing_org["id"]).execute()
                    organization = org_response.data[0]
                    logger.info(f"Updated existing organization: {final_name}")
                else:
                    # Create new organization
                    org_response = self.supabase.table("organizations").insert(org_data).execute()
                    organization = org_response.data[0]
                    logger.info(f"Created new organization: {final_name}")

                # Update scrape request as completed
                self.supabase.table("org_scrape_requests").update({
                    "status": ScrapeStatus.COMPLETED,
                    "organization_id": organization["id"]
                }).eq("id", request_id).execute()

                return organization

            except Exception as scrape_error:
                # Update scrape request as failed
                self.supabase.table("org_scrape_requests").update({
                    "status": ScrapeStatus.FAILED,
                    "error_message": str(scrape_error)
                }).eq("id", request_id).execute()
                raise

        except Exception as e:
            logger.error(f"Error processing scrape request {request_id}: {e}")
            raise

    async def get_scrape_requests_by_user(self, user_id: str) -> List[Dict]:
        """Get all scrape requests for a user"""
        try:
            response = self.supabase.table("org_scrape_requests").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching scrape requests for user {user_id}: {e}")
            raise

    async def get_pending_scrape_requests(self) -> List[Dict]:
        """Get all pending scrape requests for processing"""
        try:
            response = self.supabase.table("org_scrape_requests").select("*").eq("status", ScrapeStatus.PENDING).order("created_at").execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching pending scrape requests: {e}")
            raise

    async def search_organizations(self, school_id: str, query: str) -> List[Dict]:
        """Search organizations by name or description"""
        try:
            response = self.supabase.table("organizations").select("*").eq("school_id", school_id).ilike("name", f"%{query}%").execute()
            return response.data
        except Exception as e:
            logger.error(f"Error searching organizations: {e}")
            raise

    async def get_popular_organizations(self, school_id: str, limit: int = 10) -> List[Dict]:
        """Get popular organizations at a school (based on application count)"""
        try:
            # Use the SQL function we created
            response = self.supabase.rpc("get_popular_organizations", {
                "school_uuid": school_id,
                "limit_count": limit
            }).execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching popular organizations: {e}")
            raise

    async def update_organization(self, org_id: str, updates: Dict) -> Dict:
        """Update organization data"""
        try:
            response = self.supabase.table("organizations").update(updates).eq("id", org_id).execute()
            return response.data[0]
        except Exception as e:
            logger.error(f"Error updating organization {org_id}: {e}")
            raise