from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime
from enum import Enum

class OrgType(str, Enum):
    FRATERNITY = "fraternity"
    SORORITY = "sorority"
    CLUB = "club"
    HONOR_SOCIETY = "honor_society"
    PROFESSIONAL = "professional"
    ACADEMIC = "academic"
    SERVICE = "service"
    RECREATIONAL = "recreational"
    RELIGIOUS = "religious"
    CULTURAL = "cultural"
    OTHER = "other"

class ApplicationStatus(str, Enum):
    INTERESTED = "interested"
    APPLIED = "applied"
    INTERVIEWED = "interviewed"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"

class ScrapeStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class School(BaseModel):
    id: Optional[str] = None
    name: str
    domain: Optional[str] = None
    location: Optional[str] = None
    type: str = "university"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class Organization(BaseModel):
    id: Optional[str] = None
    school_id: str
    name: str
    type: OrgType = OrgType.CLUB
    description: Optional[str] = None
    website_url: Optional[str] = None
    application_deadline: Optional[str] = None
    application_requirements: Optional[str] = None
    contact_email: Optional[str] = None
    is_verified: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class UserOrgApplication(BaseModel):
    id: Optional[str] = None
    user_id: str
    organization_id: str
    application_status: ApplicationStatus = ApplicationStatus.INTERESTED
    application_date: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class OrgScrapeRequest(BaseModel):
    id: Optional[str] = None
    user_id: str
    school_id: str
    org_name: str
    website_url: str
    suggested_type: Optional[OrgType] = None
    status: ScrapeStatus = ScrapeStatus.PENDING
    organization_id: Optional[str] = None
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ScrapeRequestCreate(BaseModel):
    org_name: str
    website_url: str
    suggested_type: Optional[OrgType] = None

class ScrapedOrgData(BaseModel):
    name: str
    description: Optional[str] = None
    type: Optional[OrgType] = None
    contact_email: Optional[str] = None
    application_requirements: Optional[str] = None
    application_deadline: Optional[str] = None

class UserProfile(BaseModel):
    id: Optional[str] = None
    user_id: str
    school_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    graduation_year: Optional[int] = None
    major: Optional[str] = None
    profile_completed: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class UserProfileCreate(BaseModel):
    school_id: str
    first_name: str
    last_name: str
    email: str
    graduation_year: Optional[int] = None
    major: Optional[str] = None

class UserProfileUpdate(BaseModel):
    school_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    graduation_year: Optional[int] = None
    major: Optional[str] = None