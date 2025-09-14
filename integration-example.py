# Add these endpoints to your FastAPI backend (or create new file)

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import tempfile
import pathlib

# Import your existing Foundry functions
from main import run_text_path, read_tabular, QNA_DATASET_RID, SUMMARY_DATASET_RID

app = FastAPI()

class ChatRequest(BaseModel):
    message: str
    essay_content: str
    context: str = "college_essay"

class ChatResponse(BaseModel):
    response: str
    suggestions: list[str] = []
    analysis: dict = {}

@app.post("/api/chat/analyze-essay")
async def analyze_essay_with_foundry(request: ChatRequest):
    """
    Send essay content through Foundry pipeline for AI analysis
    """
    try:
        # Create temporary file with essay content
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            # Format the content for Foundry processing
            formatted_content = f"""
CONTEXT: College Essay Analysis
STUDENT_QUESTION: {request.message}
ESSAY_CONTENT:
{request.essay_content}

ANALYSIS_REQUEST: Please provide writing feedback, suggestions for improvement, and answer the student's question.
            """.strip()
            f.write(formatted_content)
            temp_path = f.name

        # Process through Foundry pipeline
        results = run_text_path_for_file(temp_path)
        
        # Extract AI responses from Foundry outputs
        qna_data = results["output1_rows_for_file"]  # QNA responses
        summary_data = results["output2_rows_for_file"]  # Summary analysis
        
        # Parse Foundry responses
        ai_response = extract_chat_response(qna_data, summary_data, request.message)
        
        # Clean up temp file
        pathlib.Path(temp_path).unlink()
        
        return ChatResponse(
            response=ai_response["main_response"],
            suggestions=ai_response["suggestions"],
            analysis=ai_response["analysis"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

def run_text_path_for_file(file_path: str):
    """
    Modified version of run_text_path that accepts a file path directly
    """
    local_txt = pathlib.Path(file_path)
    filename = local_txt.name
    
    # Use your existing upload and processing logic
    dated_prefix = f"chat_analysis/{time.strftime('%Y-%m-%d')}"
    foundry_path = f"{dated_prefix}/{filename}"
    
    # Upload to Foundry
    upload_file_one_call(TXT_INPUT_DATASET_RID, foundry_path, local_txt)
    
    # Trigger processing and wait for results
    if SCHEDULE_RID:
        run_schedule(SCHEDULE_RID)
    
    # Poll for results
    results_map = wait_for_rows(
        foundry_path,
        [QNA_DATASET_RID, SUMMARY_DATASET_RID, GENERAL_DATASET_RID],
        timeout_s=300,  # Shorter timeout for chat
        poll_s=2,
    )
    
    return {
        "output1_rows_for_file": results_map.get(QNA_DATASET_RID, pd.DataFrame()),
        "output2_rows_for_file": results_map.get(SUMMARY_DATASET_RID, pd.DataFrame()),
        "output3_rows_for_file": results_map.get(GENERAL_DATASET_RID, pd.DataFrame()),
    }

def extract_chat_response(qna_df, summary_df, user_question):
    """
    Parse Foundry AI outputs into chatbot response format
    """
    response = {
        "main_response": "I'm analyzing your essay through our AI pipeline...",
        "suggestions": [],
        "analysis": {}
    }
    
    # Extract from QNA dataset (likely contains direct answers)
    if not qna_df.empty and "response" in qna_df.columns:
        response["main_response"] = qna_df.iloc[0]["response"]
    
    # Extract suggestions from summary dataset
    if not summary_df.empty:
        if "suggestions" in summary_df.columns:
            suggestions_text = summary_df.iloc[0]["suggestions"]
            response["suggestions"] = suggestions_text.split("\n") if suggestions_text else []
        
        # Extract analysis metrics
        analysis_fields = ["word_count", "readability_score", "tone_analysis", "structure_feedback"]
        for field in analysis_fields:
            if field in summary_df.columns:
                response["analysis"][field] = summary_df.iloc[0][field]
    
    return response

@app.post("/api/chat/quick-help")
async def quick_help(request: ChatRequest):
    """
    For simple questions that don't need full Foundry processing
    """
    # Use local AI or simple rules for quick responses
    quick_responses = {
        "word count": f"Your essay currently has {len(request.essay_content.split())} words.",
        "grammar": "I'll check your grammar through our AI analysis...",
        "structure": "Let me analyze your essay structure...",
    }
    
    for keyword, response in quick_responses.items():
        if keyword in request.message.lower():
            return ChatResponse(response=response)
    
    # For complex questions, route to Foundry
    return await analyze_essay_with_foundry(request)