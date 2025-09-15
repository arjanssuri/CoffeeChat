#!/usr/bin/env python3
import requests
import json

# UT Austin organizations to scrape
organizations = [
    {"name": "Longhorn Racing", "url": "https://longhornracing.org", "type": "professional"},
    {"name": "Texas Product Engineering Organization", "url": "https://tpeo.org", "type": "professional"},
    {"name": "Freetail Hackers", "url": "https://freetailhackers.com", "type": "professional"},
    {"name": "Texas Entrepreneurs", "url": "https://texasentrepreneurs.org", "type": "professional"},
    {"name": "Orange Jackets", "url": "https://orangejackets.org", "type": "service"},
    {"name": "Design Creative", "url": "https://designcreative.org", "type": "professional"},
    {"name": "Robotics Club", "url": "https://robotics.utexas.edu", "type": "professional"},
    {"name": "Texas Debate", "url": "https://texasdebate.org", "type": "academic"},
    {"name": "Quidditch Club", "url": "https://utquidditch.org", "type": "recreational"},
    {"name": "Texas Student Union", "url": "https://union.utexas.edu", "type": "service"}
]

# User and school IDs
USER_ID = "b3076987-3713-438b-83f1-790a1d0851b9"
SCHOOL_ID = "d0709d1b-2b0d-4eb9-83ee-ebcef586d7e0"
BASE_URL = "http://localhost:8000/api/scrape-requests"

def create_scrape_request(org):
    url = f"{BASE_URL}?user_id={USER_ID}&school_id={SCHOOL_ID}"

    payload = {
        "org_name": org["name"],
        "website_url": org["url"],
        "suggested_type": org["type"]
    }

    headers = {
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Created scrape request for {org['name']}: {result['request_id']}")
            return result['request_id']
        else:
            print(f"❌ Failed to create scrape request for {org['name']}: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error creating scrape request for {org['name']}: {e}")
        return None

def trigger_processing(request_id):
    url = f"http://localhost:8000/api/scrape-requests/{request_id}/process"

    try:
        response = requests.post(url)
        if response.status_code == 200:
            print(f"✅ Triggered processing for request {request_id}")
            return True
        else:
            print(f"❌ Failed to trigger processing for request {request_id}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error triggering processing for request {request_id}: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting bulk organization scraping for UT Austin...")

    request_ids = []

    # Create scrape requests
    for org in organizations:
        request_id = create_scrape_request(org)
        if request_id:
            request_ids.append(request_id)

    print(f"\n📝 Created {len(request_ids)} scrape requests")

    # Trigger processing for each request
    print("\n🔄 Triggering processing...")
    successful_processes = 0

    for request_id in request_ids:
        if trigger_processing(request_id):
            successful_processes += 1

    print(f"\n✅ Successfully triggered processing for {successful_processes}/{len(request_ids)} requests")
    print("🎉 Bulk scraping initiated! Organizations will be processed in the background.")