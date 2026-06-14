import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.edahab_adapter import EDahabAdapter
from app.models import TransactionDirection, TransactionType

adapter = EDahabAdapter()
RECEIVED_AT = '2026-06-13T11:35:00'

SEND_PAYLOAD = {
    'event_id':   'evt_edahab_61927304b2',
    'event_type': 'transaction.completed',
    'created_at': '2026-06-13T11:34:22Z',
    'data': {
        'transaction_id':       'TXN883920173',
        'channel':              'EDAHAB',
        'type':                 'SEND_MONEY',
        'currency':             'USD',
        'amount':               0.09,
        'fee':                  0.00,
        'user_phone':           '252624567890',
        'counterparty': {
            'phone': '252620999982',
            'name':  'GEENYO LTD',
            'type':  'BUSINESS',
        },
        'reference':            'PP260602.0619.F81959',
        'user_running_balance': 0.01,
        'status':               'SUCCESS',
    }
}

RECEIVE_PAYLOAD = {
    'event_id':   'evt_edahab_88291047c3',
    'event_type': 'transaction.completed',
    'created_at': '2026-06-10T09:54:00Z',
    'data': {
        'transaction_id':       'TXN992817364',
        'channel':              'EDAHAB',
        'type':                 'RECEIVE_MONEY',
        'currency':             'USD',
        'amount':               1.00,
        'fee':                  0.00,
        'user_phone':           '252624567890',
        'counterparty': {
            'phone': '252623555777',
            'name':  'mohamoud adam moalim',
            'type':  'INDIVIDUAL',
        },
        'reference':            'PP260610.0954.F91046',
        'user_running_balance': 1.01,
        'status':               'SUCCESS',
    }
}

BANK_DEPOSIT_PAYLOAD = {
    'event_id':   'evt_edahab_77310294c1',
    'event_type': 'deposit.bank',
    'created_at': '2026-06-13T09:15:00Z',
    'data': {
        'transaction_id':       'DEP992817364',
        'channel':              'EDAHAB',
        'type':                 'BANK_DEPOSIT',
        'currency':             'USD',
        'amount':               18.00,
        'fee':                  0.00,
        'user_phone':           '252624567890',
        'counterparty':         None,
        'reference':            'DEP260613.0915.B22841',
        'user_running_balance': 2.95,
        'status':               'SUCCESS',
    }
}


class TestEDahabSend:
    def setup_method(self): self.r = adapter.map(SEND_PAYLOAD, RECEIVED_AT)
    def test_direction(self):          assert self.r.direction           == TransactionDirection.OUT
    def test_type(self):               assert self.r.type                == TransactionType.SEND
    def test_amount(self):             assert self.r.amount              == 0.09
    def test_counterparty_name(self):  assert self.r.counterparty_name   == 'GEENYO LTD'
    def test_counterparty_number(self):assert self.r.counterparty_number == '252620999982'
    def test_balance(self):            assert self.r.balance             == 0.01
    def test_reference(self):          assert self.r.reference           == 'PP260602.0619.F81959'
    def test_timestamp(self):          assert self.r.timestamp           == '2026-06-13T11:34:22'
    def test_confidence(self):         assert self.r.confidence          == 1.0


class TestEDahabReceive:
    def setup_method(self): self.r = adapter.map(RECEIVE_PAYLOAD, RECEIVED_AT)
    def test_direction(self): assert self.r.direction == TransactionDirection.IN
    def test_type(self):      assert self.r.type      == TransactionType.RECEIVE
    def test_amount(self):    assert self.r.amount    == 1.0
    def test_balance(self):   assert self.r.balance   == 1.01
    def test_reference(self): assert self.r.reference == 'PP260610.0954.F91046'
    def test_confidence(self):assert self.r.confidence == 1.0


class TestEDahabBankDeposit:
    def setup_method(self): self.r = adapter.map(BANK_DEPOSIT_PAYLOAD, RECEIVED_AT)
    def test_direction(self):  assert self.r.direction == TransactionDirection.IN
    def test_type(self):       assert self.r.type      == TransactionType.BANK_DEPOSIT
    def test_amount(self):     assert self.r.amount    == 18.0
    def test_no_counterparty(self):
        assert self.r.counterparty_name   is None
        assert self.r.counterparty_number is None
    def test_reference(self):  assert self.r.reference == 'DEP260613.0915.B22841'
    def test_confidence(self): assert self.r.confidence == 1.0