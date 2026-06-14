import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.evcplus_adapter import EVCPlusAdapter
from app.models import TransactionDirection, TransactionType

adapter = EVCPlusAdapter()
RECEIVED_AT = '2026-06-13T11:35:00'

# ── Real payload shapes ───────────────────────────────────────────────────────

SEND_PAYLOAD = {
    'event_id':   'evt_evc_98473214a7',
    'event_type': 'transaction.completed',
    'created_at': '2026-06-13T11:34:22Z',
    'data': {
        'transaction_id':    'TXN773019284',
        'channel':           'EVC_PLUS',
        'type':              'SEND_MONEY',
        'currency':          'USD',
        'amount':            1.00,
        'fee':               0.00,
        'user_phone':        '252610838368',
        'counterparty': {
            'phone': '252610838369',
            'name':  'FARDOWSA MAXAMED MAXAMUUD',
            'type':  'INDIVIDUAL',
        },
        'user_running_balance': 7.36,
        'status': 'SUCCESS',
    }
}

RECEIVE_PAYLOAD = {
    'event_id':   'evt_evc_11293847ab',
    'event_type': 'transaction.completed',
    'created_at': '2026-06-13T09:22:11Z',
    'data': {
        'transaction_id':    'TXN881726354',
        'channel':           'EVC_PLUS',
        'type':              'RECEIVE_MONEY',
        'currency':          'USD',
        'amount':            0.75,
        'fee':               0.00,
        'user_phone':        '252610838368',
        'counterparty': {
            'phone': '252613277322',
            'name':  'AHMED MOHAMED',
            'type':  'INDIVIDUAL',
        },
        'user_running_balance': 8.11,
        'status': 'SUCCESS',
    }
}

MERCHANT_PAYLOAD = {
    'event_id':   'evt_evc_55647382cd',
    'event_type': 'transaction.completed',
    'created_at': '2026-06-11T20:46:46Z',
    'data': {
        'transaction_id':    'TXN663910274',
        'channel':           'EVC_PLUS',
        'type':              'MERCHANT_PAYMENT',
        'currency':          'USD',
        'amount':            1.10,
        'fee':               0.00,
        'user_phone':        '252610838368',
        'counterparty': {
            'phone': '601020',
            'name':  'VIA JEEKEY',
            'type':  'BUSINESS',
        },
        'user_running_balance': 0.43,
        'status': 'SUCCESS',
    }
}

BANK_DEPOSIT_PAYLOAD = {
    'event_id':   'evt_evc_77392018ef',
    'event_type': 'deposit.bank',
    'created_at': '2026-06-13T08:00:00Z',
    'data': {
        'transaction_id':       'DEP112938475',
        'channel':              'EVC_PLUS',
        'type':                 'BANK_DEPOSIT',
        'currency':             'USD',
        'amount':               18.00,
        'fee':                  0.00,
        'user_phone':           '252610838368',
        'counterparty':         None,
        'user_running_balance': 2.95,
        'status':               'SUCCESS',
    }
}


class TestEVCPlusSend:
    def setup_method(self): self.r = adapter.map(SEND_PAYLOAD, RECEIVED_AT)
    def test_direction(self):          assert self.r.direction           == TransactionDirection.OUT
    def test_type(self):               assert self.r.type                == TransactionType.SEND
    def test_amount(self):             assert self.r.amount              == 1.0
    def test_currency(self):           assert self.r.currency            == 'USD'
    def test_counterparty_name(self):  assert self.r.counterparty_name   == 'FARDOWSA MAXAMED MAXAMUUD'
    def test_counterparty_number(self):assert self.r.counterparty_number == '252610838369'
    def test_balance(self):            assert self.r.balance             == 7.36
    def test_fee(self):                assert self.r.service_charge      == 0.00
    def test_reference(self):          assert self.r.reference           == 'TXN773019284'
    def test_timestamp(self):          assert self.r.timestamp           == '2026-06-13T11:34:22'
    def test_confidence(self):         assert self.r.confidence          == 1.0


class TestEVCPlusReceive:
    def setup_method(self): self.r = adapter.map(RECEIVE_PAYLOAD, RECEIVED_AT)
    def test_direction(self): assert self.r.direction == TransactionDirection.IN
    def test_type(self):      assert self.r.type      == TransactionType.RECEIVE
    def test_amount(self):    assert self.r.amount    == 0.75
    def test_balance(self):   assert self.r.balance   == 8.11
    def test_confidence(self):assert self.r.confidence == 1.0


class TestEVCPlusMerchantPayment:
    def setup_method(self): self.r = adapter.map(MERCHANT_PAYLOAD, RECEIVED_AT)
    def test_direction(self):          assert self.r.direction           == TransactionDirection.OUT
    def test_type(self):               assert self.r.type                == TransactionType.PAYMENT
    def test_amount(self):             assert self.r.amount              == 1.10
    def test_counterparty_name(self):  assert self.r.counterparty_name   == 'VIA JEEKEY'
    def test_counterparty_number(self):assert self.r.counterparty_number == '601020'
    def test_confidence(self):         assert self.r.confidence          == 1.0


class TestEVCPlusBankDeposit:
    def setup_method(self): self.r = adapter.map(BANK_DEPOSIT_PAYLOAD, RECEIVED_AT)
    def test_direction(self):     assert self.r.direction == TransactionDirection.IN
    def test_type(self):          assert self.r.type      == TransactionType.BANK_DEPOSIT
    def test_amount(self):        assert self.r.amount    == 18.0
    def test_no_counterparty(self):
        assert self.r.counterparty_name   is None
        assert self.r.counterparty_number is None
    def test_balance(self):       assert self.r.balance    == 2.95
    def test_confidence(self):    assert self.r.confidence == 1.0