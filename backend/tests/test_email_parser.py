"""
Parser tests against a real EE confirmation email shape.
Sample is the buy email from 2026-04-14 attached during dev.
"""

from datetime import datetime, timezone

import pytest

from email_parser import (
    BROKER_NAME,
    is_ee_trade_email,
    parse_ee_email,
)


SAMPLE_BUY_TEXT = (
    "EasyEquities www.easyequities.co.za "
    "tax invoice buy AMETF "
    "EasyETFs Global Equity Actively Managed ETF "
    "EasyETFs Global Equity Actively Managed ETF TRADED 1: "
    "SHARES FSRs 7431 .6290 TRADE PRICE: R 16.8200 "
    "Lynette Du Plessis Account: EasyEquities ZAR Acc. number: EE3098726-14858500 "
    "INVOICE NUMBER: #99711477 SUBMISSION DATE: 2026-04-14 13:06:17 "
    "TOTAL TRANSACTION COST 114.75 TRADE VALUE 125,000.00 TOTAL COST 125,114.75"
)


def _parse(text, mid="m1"):
    return parse_ee_email(
        message_id=mid,
        sender="EasyEquities <info@easyequities.co.za>",
        subject="Confirmation of your transaction",
        received_at=datetime.now(timezone.utc),
        text_plain="",
        text_html=text,
    )


def test_sender_allow_list():
    assert is_ee_trade_email("info@easyequities.co.za", "Confirmation of your transaction")
    assert not is_ee_trade_email("hacker@example.com", "Confirmation of your transaction")
    assert not is_ee_trade_email("info@easyequities.co.za", "Newsletter")


def test_parse_real_buy_email():
    t = _parse(SAMPLE_BUY_TEXT)
    assert t is not None
    assert t.broker_name == BROKER_NAME
    assert t.action == "buy"
    assert t.instrument_name == "EasyETFs Global Equity Actively Managed ETF"
    assert t.quantity == pytest.approx(7431.629, abs=0.001)
    assert t.trade_price == 16.82
    assert t.trade_value == 125000.0
    assert t.total_cost == 125114.75
    assert t.account_type == "ZAR"
    assert t.invoice_number == "99711477"
    assert t.submission_date == datetime(2026, 4, 14, 13, 6, 17)


def test_dedupe_handles_duplicated_instrument():
    """Instrument name appears twice in the layout — extractor must
    de-dupe to a single phrase, not the doubled one."""
    t = _parse(SAMPLE_BUY_TEXT)
    assert "EasyETFs" in t.instrument_name
    assert t.instrument_name.count("EasyETFs") == 1


def test_sell_via_explicit_verb():
    """Until we have a real sell email, verify our SOLD detection works
    when the verb appears."""
    sell_text = SAMPLE_BUY_TEXT.replace("tax invoice buy", "tax invoice sell")
    t = _parse(sell_text, mid="m2")
    assert t is not None
    assert t.action == "sell"


def test_returns_none_for_non_ee_sender():
    t = parse_ee_email(
        message_id="m3",
        sender="newsletter@somewhere.com",
        subject="Confirmation of your transaction",
        received_at=datetime.now(timezone.utc),
        text_plain="",
        text_html=SAMPLE_BUY_TEXT,
    )
    assert t is None


def test_unparseable_returns_none():
    t = parse_ee_email(
        message_id="m4",
        sender="info@easyequities.co.za",
        subject="Confirmation of your transaction",
        received_at=datetime.now(timezone.utc),
        text_plain="",
        text_html="random unrelated content",
    )
    assert t is None


def test_import_hash_is_stable_per_message_id():
    """Re-parsing the same email yields the same hash so dedup holds
    across re-syncs."""
    t1 = _parse(SAMPLE_BUY_TEXT, mid="same-id")
    t2 = _parse(SAMPLE_BUY_TEXT, mid="same-id")
    assert t1.import_hash() == t2.import_hash()


def test_quantity_combines_shares_and_fsrs():
    """SHARES 7431 + FSRs .6290 must combine to 7431.6290, not stay split."""
    t = _parse(SAMPLE_BUY_TEXT)
    assert int(t.quantity) == 7431
    assert t.quantity > 7431
