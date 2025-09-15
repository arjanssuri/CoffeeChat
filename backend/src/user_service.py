from typing import List, Optional, Dict
from database import get_supabase_client
import logging

logger = logging.getLogger(__name__)

class UserService:
    def __init__(self):
        self.supabase = get_supabase_client()

    def get_all_schools(self) -> List[Dict]:
        """Get all schools for dropdown selection"""
        try:
            response = self.supabase.table("schools").select("id, name, domain, location, logo_url").order("name").execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching schools: {e}")
            raise

    async def create_user_profile(self, user_id: str, profile_data: Dict) -> Dict:
        """Create or update user profile"""
        try:
            # Mark profile as completed when creating/updating
            profile_data["profile_completed"] = True

            # Check if profile already exists
            existing_response = self.supabase.table("profiles").select("*").eq("user_id", user_id).execute()

            if existing_response.data:
                # Update existing profile
                response = self.supabase.table("profiles").update(profile_data).eq("user_id", user_id).execute()
            else:
                # Create new profile
                profile_data["user_id"] = user_id
                response = self.supabase.table("profiles").insert(profile_data).execute()

            return response.data[0]
        except Exception as e:
            logger.error(f"Error creating/updating user profile: {e}")
            raise

    async def get_user_profile(self, user_id: str) -> Optional[Dict]:
        """Get user profile with school information"""
        try:
            response = self.supabase.rpc("get_user_profile_with_school", {"user_uuid": user_id}).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error fetching user profile: {e}")
            raise

    async def update_user_profile(self, user_id: str, updates: Dict) -> Dict:
        """Update user profile"""
        try:
            updates["profile_completed"] = True  # Mark as completed when updating
            response = self.supabase.table("profiles").update(updates).eq("user_id", user_id).execute()
            return response.data[0]
        except Exception as e:
            logger.error(f"Error updating user profile: {e}")
            raise

    async def get_school_by_id(self, school_id: str) -> Optional[Dict]:
        """Get school information by ID"""
        try:
            response = self.supabase.table("schools").select("*").eq("id", school_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error fetching school {school_id}: {e}")
            raise