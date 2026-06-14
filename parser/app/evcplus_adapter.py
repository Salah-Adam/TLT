from .models import ParseResult, Provider, TransactionDirection, TransactionType


class EVCPlusAdapter:
    """
    Maps EVC Plus structured JSON webhook payload to ParseResult.

    Handles two event types:
      - transaction.completed  → covers SEND_MONEY, RECEIVE_MONEY, MERCHANT_PAYMENT
      - deposit.bank           → covers BANK_DEPOSIT

    Payload structure:
      {
        "event_id":   "evt_evc_...",
        "event_type": "transaction.completed",
        "created_at": "2026-06-13T11:34:22Z",
        "data": {
          "transaction_id":    "TXN773019284",
          "channel":           "EVC_PLUS",
          "type":              "SEND_MONEY",
          "currency":          "USD",
          "amount":            1.00,
          "fee":               0.00,
          "user_phone":        "252610838368",
          "counterparty": {
            "phone": "252610838369",
            "name":  "FARDOWSA MAXAMED MAXAMUUD",
            "type":  "INDIVIDUAL"
          },
          "user_running_balance": 7.36,
          "status": "SUCCESS"
        }
      }
    """

    provider = Provider.EVCPLUS

    # Maps data.type string to TLT TransactionType enum
    TYPE_MAP = {
        'SEND_MONEY':        TransactionType.SEND,
        'RECEIVE_MONEY':     TransactionType.RECEIVE,
        'MERCHANT_PAYMENT':  TransactionType.PAYMENT,
        'BANK_DEPOSIT':      TransactionType.BANK_DEPOSIT,
    }

    # Maps data.type string to TLT TransactionDirection enum
    DIRECTION_MAP = {
        'SEND_MONEY':        TransactionDirection.OUT,
        'RECEIVE_MONEY':     TransactionDirection.IN,
        'MERCHANT_PAYMENT':  TransactionDirection.OUT,
        'BANK_DEPOSIT':      TransactionDirection.IN,
    }

    def map(self, payload: dict, received_at: str) -> ParseResult:
        """
        Map EVC Plus structured JSON to ParseResult.

        The payload has two levels:
          - top level:  event envelope (event_id, event_type, created_at)
          - data level: the actual transaction fields

        We read from both levels.
        """

        # The transaction data lives inside payload["data"]
        data = payload.get('data', {})

        # Transaction type drives direction — both come from data.type
        transaction_type = data.get('type', '')
        direction = self.DIRECTION_MAP.get(transaction_type)
        type_     = self.TYPE_MAP.get(transaction_type)

        # Counterparty is a nested object — may be None for bank deposits
        counterparty = data.get('counterparty') or {}
        counterparty_name   = counterparty.get('name')   if counterparty else None
        counterparty_number = counterparty.get('phone')  if counterparty else None

        # Timestamp comes from top-level created_at
        # Slice to 19 chars to remove timezone offset — store as naive ISO datetime
        raw_ts    = payload.get('created_at', '')
        timestamp = raw_ts[:19] if raw_ts else received_at[:19]

        return ParseResult(
            provider            = self.provider,
            raw_message         = str(payload),   # always preserve original for audit
            direction           = direction,
            type                = type_,
            amount              = float(data.get('amount', 0)),
            currency            = data.get('currency', 'USD'),
            counterparty_name   = counterparty_name,
            counterparty_number = counterparty_number,
            balance             = float(data.get('user_running_balance', 0)),
            service_charge      = float(data.get('fee', 0)),
            reference           = data.get('transaction_id'),
            timestamp           = timestamp,
            confidence          = 1.0,  # always perfect for structured data
        )