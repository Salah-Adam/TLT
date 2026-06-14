from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


# ── Enums ────────────────────────────────────────────────────────────────────
# Enums restrict values to a fixed set.
# Using enums instead of plain strings means a typo like "outt" or "SEND"
# is caught immediately rather than silently stored as wrong data.

class TransactionDirection(str, Enum):
    """Whether money moved into or out of the user's account."""
    IN  = "in"   # user received money
    OUT = "out"  # user sent money


class TransactionType(str, Enum):
    """
    The category of transaction.
    These map directly to the categories seeded in the database during Phase 2.
    """
    SEND         = "send"         # sent to a person
    RECEIVE      = "receive"      # received from a person
    PAYMENT      = "payment"      # paid a merchant / business
    BANK_DEPOSIT = "bank_deposit" # deposited into bank account


class Provider(str, Enum):
    """The telecom provider that sent this transaction."""
    EVCPLUS = "evcplus"  # Hormuud EVC Plus
    EDAHAB  = "edahab"   # Somtel eDahab


# ── Input Model ───────────────────────────────────────────────────────────────

class ParseRequest(BaseModel):
    """
    What the worker sends to the parser service.
    payload is the full structured JSON from the webhook body.
    received_at is the webhook arrival timestamp — used as fallback
    if the payload has no timestamp.
    """
    provider:    Provider
    payload:     dict    # full structured JSON from webhook
    received_at: str
    
# class ParseRequest(BaseModel):
#     """
#     What the webhook worker sends TO the parser.
#     Contains everything the parser needs to do its job.
#     """
#     provider:    Provider          # which parser to use
#     raw_message: str               # the raw SMS text to parse
#     received_at: str               # ISO timestamp from webhook arrival
#                                    # used as fallback when SMS has no timestamp




# ── Output Model ─────────────────────────────────────────────────────────────
class ParseResult(BaseModel):
    """
    What the parser returns after processing an SMS.
    This is the clean, structured data the worker writes to the database.

    Every field is Optional except provider, confidence, and raw_message —
    because not every SMS contains every field.
    For example: the EVC Plus bank deposit has no timestamp,
    and receiving from a number-only sender has no counterparty_name.
    """

    # ── Identity ──────────────────────────────────────────────────────────────
    provider:    Provider          # which provider this came from
    raw_message: str               # the original SMS text, always stored for audit

    # ── Core transaction data ─────────────────────────────────────────────────
    direction:   Optional[TransactionDirection] = None  # in or out
    type:        Optional[TransactionType]      = None  # send, receive, payment, bank_deposit
    amount:      Optional[float]               = None  # transaction amount in USD
    currency:    str                           = "USD"  # always USD for Somali mobile money

    # ── Counterparty ─────────────────────────────────────────────────────────
    # The person or business on the other side of the transaction.
    # Name may be absent (e.g. receiving from a number with no name).
    # Number may be absent (e.g. bank deposit has no counterparty number).
    counterparty_name:   Optional[str]   = None
    counterparty_number: Optional[str]   = None

    # ── Financial details ─────────────────────────────────────────────────────
    balance:        Optional[float] = None  # account balance after transaction
    service_charge: float           = 0.00  # fee charged by the provider
    reference:      Optional[str]   = None  # transaction reference / Tixrac

    # ── Timing ───────────────────────────────────────────────────────────────
    # timestamp is the time from the SMS itself.
    # If the SMS has no timestamp (e.g. bank deposit), this is None.
    # The worker will use webhook received_at as fallback.
    timestamp: Optional[str] = None  # ISO format: "2026-06-12T20:09:48"

    # ── Quality indicator ─────────────────────────────────────────────────────
    # How confident the parser is about its output.
    # 0.0 = nothing extracted  1.0 = everything extracted perfectly
    # Threshold: below 0.70 → transaction flagged for review
    confidence: float = Field(ge=0.0, le=1.0)  # ge = greater or equal, le = less or equal

    # ── Error information ─────────────────────────────────────────────────────
    # If parsing failed, error contains the reason.
    # parse_attempted is always True — it tells us we tried even if we failed.
    parse_attempted: bool = True
    error:           Optional[str] = None