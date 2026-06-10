from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI()

class SMSParseRequest(BaseModel):
    message: str
    sender: str

class SMSParseResponse(BaseModel):
    success: bool
    data: dict

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "parser",
        "timestamp": __import__("datetime").datetime.utcnow().isoformat()
    }

@app.post("/parse")
async def parse_sms(request: SMSParseRequest):
    # Actual parsing logic will be added here later
    return SMSParseResponse(
        success=True,
        data={
            "raw_message": request.message,
            "sender": request.sender
        }
    )
