from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import sys
from dotenv import load_dotenv

# Add src directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from models import ScrapeRequestCreate, OrgType, UserProfileCreate, UserProfileUpdate
from org_service import OrganizationService
from user_service import UserService

# Load environment variables
load_dotenv()

app = FastAPI(title="CoffeeChat API", version="1.0.0")
org_service = OrganizationService()
user_service = UserService()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data models
class FoundryEvent(BaseModel):
    event_name: str
    event_date: str
    event_time: str
    club_name: str
    location: Optional[str] = None
    description: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    essay_content: str
    context: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    suggestions: Optional[List[str]] = None
    analysis: Optional[dict] = None

@app.get("/")
async def root():
    return {"message": "CoffeeChat API is running!"}

@app.get("/api/events/foundry", response_model=List[FoundryEvent])
async def get_foundry_events():
    """
    Get club events from Foundry pipeline.
    In a real implementation, this would fetch from your Foundry EVENT dataset.
    """
    # Mock data for demo - replace with actual Foundry integration
    mock_events = [
        FoundryEvent(
            event_name="Tech Networking Night",
            event_date="2024-01-20",
            event_time="18:00",
            club_name="TPEO",
            location="GDC 1.304",
            description="Connect with fellow engineers and product managers"
        ),
        FoundryEvent(
            event_name="Design Workshop",
            event_date="2024-01-22",
            event_time="19:00", 
            club_name="TPEO",
            location="GDC 2.216",
            description="Learn advanced UX/UI design principles"
        ),
        FoundryEvent(
            event_name="Product Management 101",
            event_date="2024-01-25",
            event_time="20:00",
            club_name="TPEO",
            location="Virtual",
            description="Introduction to product management fundamentals"
        ),
        FoundryEvent(
            event_name="Coding Bootcamp",
            event_date="2024-01-28",
            event_time="15:00",
            club_name="CS Club",
            location="GDC 6.302",
            description="Learn full-stack development from scratch"
        )
    ]
    
    return mock_events

@app.post("/api/events/sync-calendar")
async def sync_foundry_with_calendar():
    """
    Sync Foundry events with Google Calendar.
    In a real implementation, this would integrate with the Foundry EVENT dataset.
    """
    return {"success": True, "message": "Events synced successfully"}

@app.post("/api/chat/analyze-essay", response_model=ChatResponse)
async def analyze_essay(request: ChatRequest):
    """
    Analyze essay with AI assistance.
    In a real implementation, this would integrate with Foundry pipelines.
    """
    # Mock AI response
    return ChatResponse(
        response=f"I've analyzed your essay about '{request.context or 'your topic'}'. Here are some insights based on your message: '{request.message}'",
        suggestions=[
            "Consider adding more specific examples",
            "Strengthen your conclusion",
            "Check for grammar and flow"
        ],
        analysis={
            "word_count": len(request.essay_content.split()),
            "readability_score": 8.5,
            "tone_analysis": "Academic and engaging",
            "structure_feedback": "Well-organized with clear paragraphs"
        }
    )

@app.post("/api/chat/quick-help", response_model=ChatResponse)
async def quick_help(request: ChatRequest):
    """
    Quick AI help for essay writing.
    """
    # Mock quick response
    return ChatResponse(
        response=f"Quick help: {request.message}. Consider revising for clarity and impact.",
        suggestions=["Use active voice", "Vary sentence length"]
    )

# Organization and scraping endpoints
@app.get("/api/organizations/{school_id}")
async def get_organizations(school_id: str):
    """Get all organizations for a school"""
    try:
        organizations = await org_service.get_organizations_by_school(school_id)
        return {"organizations": organizations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/organizations/{school_id}/popular")
async def get_popular_organizations(school_id: str, limit: int = 10):
    """Get popular organizations at a school"""
    try:
        organizations = await org_service.get_popular_organizations(school_id, limit)
        return {"organizations": organizations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/organizations/{school_id}/search")
async def search_organizations(school_id: str, q: str):
    """Search organizations by name"""
    try:
        organizations = await org_service.search_organizations(school_id, q)
        return {"organizations": organizations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scrape-requests")
async def create_scrape_request(
    request: ScrapeRequestCreate,
    user_id: str,
    school_id: str,
    background_tasks: BackgroundTasks
):
    """Submit a new organization for scraping"""
    try:
        # Create the scrape request
        scrape_request = await org_service.create_scrape_request(
            user_id=user_id,
            school_id=school_id,
            org_name=request.org_name,
            website_url=request.website_url,
            suggested_type=request.suggested_type
        )

        # Process in background
        background_tasks.add_task(
            org_service.process_scrape_request,
            scrape_request["id"]
        )

        return {
            "message": "Scrape request submitted successfully",
            "request_id": scrape_request["id"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/scrape-requests/{user_id}")
async def get_user_scrape_requests(user_id: str):
    """Get all scrape requests for a user"""
    try:
        requests = await org_service.get_scrape_requests_by_user(user_id)
        return {"requests": requests}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scrape-requests/{request_id}/process")
async def process_scrape_request(request_id: str, background_tasks: BackgroundTasks):
    """Manually trigger processing of a scrape request"""
    try:
        background_tasks.add_task(
            org_service.process_scrape_request,
            request_id
        )
        return {"message": "Processing started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/scrape-requests/pending")
async def get_pending_scrape_requests():
    """Get all pending scrape requests (admin endpoint)"""
    try:
        requests = await org_service.get_pending_scrape_requests()
        return {"requests": requests}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# User profile endpoints
@app.get("/api/schools")
def get_schools():
    """Get all schools for dropdown selection"""
    try:
        schools = user_service.get_all_schools()
        return {"schools": schools}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/users/{user_id}/profile")
async def create_user_profile(user_id: str, profile: UserProfileCreate):
    """Create or update user profile"""
    try:
        profile_data = profile.dict()
        user_profile = await user_service.create_user_profile(user_id, profile_data)
        return {"profile": user_profile}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/users/{user_id}/profile")
async def get_user_profile(user_id: str):
    """Get user profile with school information"""
    try:
        profile = await user_service.get_user_profile(user_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        return {"profile": profile}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/api/users/{user_id}/profile")
async def update_user_profile(user_id: str, updates: UserProfileUpdate):
    """Update user profile"""
    try:
        update_data = {k: v for k, v in updates.dict().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid fields to update")

        profile = await user_service.update_user_profile(user_id, update_data)
        return {"profile": profile}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)