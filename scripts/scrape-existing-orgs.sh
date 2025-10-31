#!/bin/bash

# Scrape existing organizations in the database
echo "🚀 Scraping existing organizations from database..."

USER_ID="b3076987-3713-438b-83f1-790a1d0851b9"
SCHOOL_ID="d0709d1b-2b0d-4eb9-83ee-ebcef586d7e0"
API_BASE="http://localhost:8000/api/scrape-requests"

# Get existing organizations from database and create scrape requests
echo "📊 Fetching existing organizations..."

# Organizations already in database with their websites
declare -a ORGS=(
    "Texas Convergent|https://txconvergent.org|professional"
    "Longhorn Racing|https://www.longhornracing.org|professional"
    "Texas Blockchain|https://www.texasblockchain.org|professional"
    "Texas Finance Team|https://www.texasfteam.org|professional"
    "Texas Stock Team|https://texasstockteam.com|professional"
    "TUIT|https://www.texasuit.com|professional"
    "USIT|https://www.texasusit.org|professional"
    "USIT QMI|https://usitqmi.com|professional"
)

# Function to create scrape request
create_request() {
    local org_name="$1"
    local url="$2"
    local type="$3"

    echo "📝 Creating scrape request for: $org_name"

    response=$(curl -s -X POST "${API_BASE}?user_id=${USER_ID}&school_id=${SCHOOL_ID}" \
        -H "Content-Type: application/json" \
        -d "{
            \"org_name\": \"$org_name\",
            \"website_url\": \"$url\",
            \"suggested_type\": \"$type\"
        }")

    # Extract request_id from response
    request_id=$(echo "$response" | grep -o '"request_id":"[^"]*"' | sed 's/"request_id":"//' | sed 's/"//')

    if [ ! -z "$request_id" ]; then
        echo "✅ Created request $request_id for $org_name"
        echo "$request_id"
    else
        echo "❌ Failed to create request for $org_name"
        echo "Response: $response"
        echo ""
    fi
}

# Function to process scrape request
process_request() {
    local request_id="$1"
    local org_name="$2"

    echo "🔄 Processing: $org_name (ID: $request_id)"

    response=$(curl -s -X POST "http://localhost:8000/api/scrape-requests/$request_id/process")

    if [[ "$response" == *"Processing started"* ]]; then
        echo "✅ Started processing $org_name"
    else
        echo "❌ Failed to start processing $org_name"
        echo "Response: $response"
    fi
    echo ""
}

# Create all requests first
echo ""
echo "🏗️  Creating scrape requests for existing organizations..."
echo "=================================================="

declare -a REQUEST_IDS=()
declare -a ORG_NAMES=()

for org in "${ORGS[@]}"; do
    IFS='|' read -r name url type <<< "$org"
    request_id=$(create_request "$name" "$url" "$type")
    if [ ! -z "$request_id" ]; then
        REQUEST_IDS+=("$request_id")
        ORG_NAMES+=("$name")
    fi
    sleep 1  # Small delay between requests
done

echo ""
echo "⚡ Processing scrape requests..."
echo "================================="

# Process all requests
for i in "${!REQUEST_IDS[@]}"; do
    process_request "${REQUEST_IDS[$i]}" "${ORG_NAMES[$i]}"
    sleep 2  # Delay between processing
done

echo ""
echo "📊 Summary:"
echo "Created ${#REQUEST_IDS[@]} scrape requests"
echo "Started processing ${#REQUEST_IDS[@]} organizations"
echo ""
echo "🎉 Re-indexing complete! Organizations have been properly scraped and indexed."
echo ""
echo "Check results with:"
echo "curl -X GET http://localhost:8000/api/organizations/$SCHOOL_ID"