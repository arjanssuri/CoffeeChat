#!/bin/bash

# Firecrawl-based organization scraping script
echo "🔥 Starting Firecrawl-based organization scraping..."

if [ -z "$FIRECRAWL_API_KEY" ]; then
    echo "❌ FIRECRAWL_API_KEY environment variable is required"
    exit 1
fi

USER_ID="b3076987-3713-438b-83f1-790a1d0851b9"
SCHOOL_ID="d0709d1b-2b0d-4eb9-83ee-ebcef586d7e0"
API_BASE="http://localhost:8000/api/scrape-requests"

# Organizations to scrape with Firecrawl
declare -a ORGS=(
    "Texas Convergent|https://txconvergent.org|professional"
    "Texas Product Engineering Organization|https://tpeo.org|professional"
    "Freetail Hackers|https://freetailhackers.com|professional"
    "Texas Entrepreneurs|https://texasentrepreneurs.org|professional"
)

# Function to create scrape request
create_and_process_request() {
    local org_name="$1"
    local url="$2"
    local type="$3"

    echo "🔥 Scraping: $org_name"

    # Create scrape request
    response=$(curl -s -X POST "${API_BASE}?user_id=${USER_ID}&school_id=${SCHOOL_ID}" \
        -H "Content-Type: application/json" \
        -d "{
            \"org_name\": \"$org_name\",
            \"website_url\": \"$url\",
            \"suggested_type\": \"$type\"
        }")

    # Extract request_id
    request_id=$(echo "$response" | grep -o '"request_id":"[^"]*"' | sed 's/"request_id":"//' | sed 's/"//')

    if [ ! -z "$request_id" ]; then
        echo "✅ Created request $request_id"

        # Process immediately
        process_response=$(curl -s -X POST "http://localhost:8000/api/scrape-requests/$request_id/process")

        if [[ "$process_response" == *"Processing started"* ]]; then
            echo "🔄 Processing started for $org_name"
        else
            echo "❌ Failed to start processing: $process_response"
        fi
    else
        echo "❌ Failed to create request: $response"
    fi

    echo ""
    sleep 3  # Wait between requests
}

echo ""
echo "🏗️  Creating and processing scrape requests with Firecrawl..."
echo "======================================================="

for org in "${ORGS[@]}"; do
    IFS='|' read -r name url type <<< "$org"
    create_and_process_request "$name" "$url" "$type"
done

echo ""
echo "🎉 Firecrawl scraping complete!"
echo ""
echo "Check results:"
echo "curl -X GET http://localhost:8000/api/organizations/$SCHOOL_ID"