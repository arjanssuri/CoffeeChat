from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="CoffeeChat API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)