from fastapi import FastAPI, HTTPException
from app.models import ParseRequest, ParseResult
from app.parser_factory import parse_transaction

app = FastAPI(
    title='TLT Structured JSON Parser',
    description='Maps structured telecom webhook JSON to ParseResult',
    version='2.0.0',
)


@app.get('/health')
def health_check():
    return {'status': 'ok', 'service': 'parser', 'mode': 'structured_json'}


@app.post('/parse', response_model=ParseResult)
def parse_webhook(request: ParseRequest):
    """
    Map a structured JSON webhook payload to ParseResult.
    Called by the transaction worker for every queued job.
    """
    try:
        return parse_transaction(request.provider, request.payload, request.received_at)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Adapter error: {str(e)}')

# ---------------------------

# from fastapi import FastAPI, HTTPException
# from app.models import ParseRequest, ParseResult
# from app.parser_factory import parse_transaction

# app = FastAPI(
#     title="TLT SMS Parser",
#     description="Parses raw SMS transaction messages from Somali mobile money providers",
#     version="1.0.0",
# )


# @app.get("/health")
# def health_check():
#     """
#     Health check endpoint.
#     Called by Docker health checks and the webhook server startup verification.
#     """
#     return {
#         "status": "ok",
#         "service": "parser",
#     }


# @app.post("/parse", response_model=ParseResult)
# def parse_sms(request: ParseRequest):
#     """
#     Parse a raw SMS transaction message.

#     Called by the transaction worker (Phase 4) for every queued webhook job.

#     The worker sends:
#       - provider:    which telecom ("evcplus" or "edahab")
#       - raw_message: the SMS text from the webhook body
#       - received_at: when the webhook arrived (ISO timestamp)

#     Returns a fully structured ParseResult.

#     If parsing fails completely, returns a ParseResult with confidence=0.0
#     and the error field populated — never raises a 500 error for bad SMS content,
#     because bad SMS content is expected (telecoms sometimes send malformed messages).
#     Only raises HTTPException for genuinely invalid requests (unknown provider).
#     """
#     try:
#         result = parse_transaction(request)
#         return result
#     except ValueError as e:
#         # Unknown provider — this is a client error, not a parser error
#         raise HTTPException(status_code=400, detail=str(e))
#     except Exception as e:
#         # Unexpected server error — log and return 500
#         raise HTTPException(status_code=500, detail=f"Parser error: {str(e)}")



# ---------------------------------------------------------
# from fastapi import FastAPI
# from pydantic import BaseModel
# from dotenv import load_dotenv
# import os

# load_dotenv()

# app = FastAPI()

# class SMSParseRequest(BaseModel):
#     message: str
#     sender: str

# class SMSParseResponse(BaseModel):
#     success: bool
#     data: dict

# @app.get("/health")
# async def health():
#     return {
#         "status": "ok",
#         "service": "parser",
#         "timestamp": __import__("datetime").datetime.utcnow().isoformat()
#     }

# @app.post("/parse")
# async def parse_sms(request: SMSParseRequest):
#     # Actual parsing logic will be added here later
#     return SMSParseResponse(
#         success=True,
#         data={
#             "raw_message": request.message,
#             "sender": request.sender
#         }
#     )
