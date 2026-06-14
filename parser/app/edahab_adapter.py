from .models import ParseResult, Provider, TransactionDirection, TransactionType


class EDahabAdapter:
    """
    Maps eDahab structured JSON webhook payload to ParseResult.

    Handles two event types:
      - transaction.completed  → covers SEND_MONEY, RECEIVE_MONEY
      - deposit.bank           → covers BANK_DEPOSIT

    Payload structure mirrors EVC Plus envelope but with channel: EDAHAB
    and an additional reference field:
      {
        "event_id":   "evt_edahab_...",
        "event_type": "transaction.completed",
        "created_at": "2026-06-13T11:34:22Z",
        "data": {
          "transaction_id":       "TXN883920173",
          "channel":              "EDAHAB",
          "type":                 "SEND_MONEY",
          "currency":             "USD",
          "amount":               0.09,
          "fee":                  0.00,
          "user_phone":           "252624567890",
          "counterparty": {
            "phone": "252620999982",
            "name":  "GEENYO LTD",
            "type":  "BUSINESS"
          },
          "reference":            "PP260602.0619.F81959",
          "user_running_balance": 0.01,
          "status":               "SUCCESS"
        }
      }
    """

    provider = Provider.EDAHAB

    TYPE_MAP = {
        'SEND_MONEY':        TransactionType.SEND,
        'RECEIVE_MONEY':     TransactionType.RECEIVE,
        'MERCHANT_PAYMENT':  TransactionType.PAYMENT,
        'BANK_DEPOSIT':      TransactionType.BANK_DEPOSIT,
    }

    DIRECTION_MAP = {
        'SEND_MONEY':        TransactionDirection.OUT,
        'RECEIVE_MONEY':     TransactionDirection.IN,
        'MERCHANT_PAYMENT':  TransactionDirection.OUT,
        'BANK_DEPOSIT':      TransactionDirection.IN,
    }

    def map(self, payload: dict, received_at: str) -> ParseResult:
        """
        Map eDahab structured JSON to ParseResult.

        Structure is identical to EVC Plus envelope.
        Key difference: data has a reference field that EVC Plus
        does not have — we map it to ParseResult.reference.
        """

        data = payload.get('data', {})

        transaction_type = data.get('type', '')
        direction = self.DIRECTION_MAP.get(transaction_type)
        type_     = self.TYPE_MAP.get(transaction_type)

        counterparty = data.get('counterparty') or {}
        counterparty_name   = counterparty.get('name')  if counterparty else None
        counterparty_number = counterparty.get('phone') if counterparty else None

        raw_ts    = payload.get('created_at', '')
        timestamp = raw_ts[:19] if raw_ts else received_at[:19]

        return ParseResult(
            provider            = self.provider,
            raw_message         = str(payload),
            direction           = direction,
            type                = type_,
            amount              = float(data.get('amount', 0)),
            currency            = data.get('currency', 'USD'),
            counterparty_name   = counterparty_name,
            counterparty_number = counterparty_number,
            balance             = float(data.get('user_running_balance', 0)),
            service_charge      = float(data.get('fee', 0)),
            reference           = data.get('reference'),  # eDahab specific field
            timestamp           = timestamp,
            confidence          = 1.0,
        )