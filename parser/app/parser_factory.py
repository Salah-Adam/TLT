from .models import Provider, ParseResult
from .evcplus_adapter import EVCPlusAdapter
from .edahab_adapter  import EDahabAdapter

# Registry — one adapter instance per provider
# Add new providers here when partnership agreements are signed
ADAPTER_REGISTRY = {
    Provider.EVCPLUS: EVCPlusAdapter(),
    Provider.EDAHAB:  EDahabAdapter(),
}


def parse_transaction(provider: Provider, payload: dict, received_at: str) -> ParseResult:
    """
    Route structured JSON payload to the correct provider adapter.
    Called by main.py /parse endpoint for every queued job.
    """
    adapter = ADAPTER_REGISTRY.get(provider)
    if adapter is None:
        raise ValueError(f'No adapter registered for provider: {provider}')
    return adapter.map(payload, received_at)











# from .models import Provider, ParseResult, ParseRequest
# from .evcplus_parser import EVCPlusParser
# from .edahab_parser import EDahabParser
# from .base_parser import BaseParser


# # ── Parser registry ───────────────────────────────────────────────────────────
# # Maps provider enum values to their parser instances.
# # When a new provider is added (Telesom ZAAD, Sahal), add one line here.
# # Nothing else in the codebase needs to change.
# PARSER_REGISTRY: dict[Provider, BaseParser] = {
#     Provider.EVCPLUS: EVCPlusParser(),
#     Provider.EDAHAB:  EDahabParser(),
# }


# def parse_transaction(request: ParseRequest) -> ParseResult:
#     """
#     Route a parse request to the correct provider parser.

#     This is the single entry point for all parsing operations.
#     The FastAPI endpoint calls this function — it never touches
#     individual parsers directly.

#     Args:
#         request: ParseRequest containing provider, raw_message, received_at

#     Returns:
#         ParseResult from the appropriate parser

#     Raises:
#         ValueError if the provider has no registered parser
#     """
#     parser = PARSER_REGISTRY.get(request.provider)

#     if parser is None:
#         # This should never happen in production because the webhook server
#         # validates the provider before queuing — but we handle it defensively.
#         raise ValueError(
#             f"No parser registered for provider: {request.provider}. "
#             f"Registered providers: {list(PARSER_REGISTRY.keys())}"
#         )

#     return parser.parse(
#         raw_message = request.raw_message,
#         received_at = request.received_at,
#     )