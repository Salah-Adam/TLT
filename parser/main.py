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
