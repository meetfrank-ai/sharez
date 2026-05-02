"""
Parse EasyEquities trade-confirmation emails into structured ParsedTrade objects.

Sender allow-list: emails are only ever parsed if they came from
info@easyequities.co.za. Anything else is ignored — we never read the rest
of the user's inbox.

Email format (after HTML strip), reference sample 2026-04-14:

    EasyEquities www.easyequities.co.za ... tax invoice buy
    AMETF EasyETFs Global Equity Actively Managed ETF
    EasyETFs Global Equity Actively Managed ETF
    TRADED 1:
    SHARES   FSRs
    7431     .6290
    TRADE PRICE: R 16.8200
    Lynette Du Plessis
    Account: EasyEquities ZAR
    Acc. number: EE3098726-14858500
    INVOICE NUMBER: #99711477
    SUBMISSION DATE: 2026-04-14 13:06:17
    SETTLEMENT DATE: 2026-04-24
    ...
    TOTAL TRANSACTION COST 114.75
    TRADE VALUE 125,000.00
    TOTAL COST 125,114.75

The buy/sell badge is rendered as a small text/image; we detect by:
  1. Image alt text in the raw HTML (`alt="buy"` / `alt="sell"`)
  2. The "tax invoice {buy|sell}" text after HTML strip
  3. "TOTAL COST" (buy) vs "NET PROCEEDS" / "TOTAL PROCEEDS" (sell) line items
"""

from __future__ import annotations

import hashlib
import logging
import re
from dataclasses import dataclass
from datetime import datetime
from html.parser import HTMLParser

logger = logging.getLogger(__name__)


ALLOWED_SENDERS = {
    "info@easyequities.co.za",
    "info@easyequities.com",
}


SUBJECT_HINTS = (
    "confirmation of your transaction",
    "trade confirmation",
)


@dataclass
class ParsedTrade:
    """A single parsed buy/sell event from an EE confirmation email."""
    message_id: str
    received_at: datetime
    submission_date: datetime | None
    action: str  # "buy" or "sell"
    instrument_name: str
    quantity: float                # SHARES + FSRs combined
    trade_price: float | None      # per-share price in account currency
    trade_value: float | None      # gross trade value (quantity * price)
    total_cost: float | None       # buy: incl. fees; sell: net proceeds
    account_type: str              # ZAR / TFSA / USD / RA / etc.
    invoice_number: str | None
    raw_text_snippet: str          # for debugging / verification only

    def import_hash(self) -> str:
        """Stable dedup key. The Gmail message_id alone uniquely identifies the email."""
        return hashlib.sha256(self.message_id.encode()).hexdigest()


class _TextExtractor(HTMLParser):
    """Extract visible text from HTML, dropping script/style and capturing img alt text."""

    def __init__(self) -> None:
        super().__init__()
        self._chunks: list[str] = []
        self._alts: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self._skip_depth += 1
        if tag == "img":
            for k, v in attrs:
                if k == "alt" and v:
                    self._alts.append(v)

    def handle_endtag(self, tag):
        if tag in ("script", "style") and self._skip_depth > 0:
            self._skip_depth -= 1

    def handle_data(self, data):
        if self._skip_depth == 0 and data.strip():
            self._chunks.append(data)

    def text(self) -> str:
        return re.sub(r"\s+", " ", " ".join(self._chunks)).strip()

    def alt_text(self) -> str:
        return " ".join(self._alts)


def _strip_html(html: str) -> tuple[str, str]:
    """Returns (visible_text, joined_alt_text)."""
    parser = _TextExtractor()
    try:
        parser.feed(html)
        return parser.text(), parser.alt_text()
    except Exception as e:
        logger.warning("HTML parse failed, falling back to regex: %s", e)
        plain = re.sub(r"<[^>]+>", " ", html)
        return re.sub(r"\s+", " ", plain).strip(), ""


def _extract_address(sender_header: str) -> str:
    m = re.search(r"<([^>]+)>", sender_header)
    return (m.group(1) if m else sender_header).strip().lower()


def is_ee_trade_email(sender: str, subject: str) -> bool:
    if not sender:
        return False
    if _extract_address(sender) not in ALLOWED_SENDERS:
        return False
    s = (subject or "").lower()
    return any(hint in s for hint in SUBJECT_HINTS)


def parse_ee_email(
    *,
    message_id: str,
    sender: str,
    subject: str,
    received_at: datetime,
    text_plain: str,
    text_html: str,
) -> ParsedTrade | None:
    """
    Returns a ParsedTrade if the email is a recognised EE confirmation, else None.
    Defensive: if instrument or quantity can't be extracted we return None and
    the orchestrator skips the email.
    """
    if not is_ee_trade_email(sender, subject):
        return None

    # Always strip HTML — the plain-text alternative EE provides is poor.
    text_from_html, alt_text = _strip_html(text_html or "")
    body = text_from_html or (text_plain or "").strip()
    if not body:
        return None
    text = re.sub(r"\s+", " ", body)

    instrument = _extract_instrument(text)
    if not instrument:
        logger.warning("EE email %s: instrument not found. Snippet: %s", message_id, text[:200])
        return None

    quantity = _extract_quantity(text)
    if quantity is None:
        logger.warning("EE email %s: quantity not found. Snippet: %s", message_id, text[:200])
        return None

    trade_price = _extract_trade_price(text)
    trade_value = _extract_trade_value(text)
    total_cost = _extract_total_cost(text)
    action = _extract_action(text=text, alt_text=alt_text, raw_html=text_html or "")
    account_type = _extract_account_type(text)
    submission_date = _extract_submission_date(text)
    invoice_number = _extract_invoice_number(text)

    return ParsedTrade(
        message_id=message_id,
        received_at=received_at,
        submission_date=submission_date,
        action=action,
        instrument_name=instrument,
        quantity=quantity,
        trade_price=trade_price,
        trade_value=trade_value,
        total_cost=total_cost,
        account_type=account_type,
        invoice_number=invoice_number,
        raw_text_snippet=text[:400],
    )


# ----- Field extractors -----


# Asset-class chips that appear before the instrument name and are NEVER part of
# it (e.g. "AMETF" badge sits above "EasyETFs Global Equity Actively Managed ETF").
# Brand tokens like "EasyETFs" / "10X" / "Satrix" are intentionally NOT stripped
# because they're part of the real instrument name.
_LEAD_NOISE = {"AMETF", "AMETFS", "UT", "MMF", "STOCK", "STOCKS"}


def _extract_instrument(text: str) -> str | None:
    """
    EE format: 'tax invoice {buy|sell} [BADGE...] {Instrument} {Instrument} TRADED N:'
    The instrument name appears twice (logo card + headline row). We capture
    everything between the buy/sell verb and 'TRADED N:' then de-duplicate.
    """
    m = re.search(
        r"tax\s+invoice\s+(?:buy|sell|bought|sold)\s+(.+?)\s+TRADED\s+\d+\s*:",
        text,
        re.IGNORECASE,
    )
    if m:
        chunk = m.group(1).strip()
        chunk = _strip_lead_noise(chunk)
        chunk = _dedupe_repeated(chunk)
        return chunk or None

    # Fallback: legacy "Tax Invoice for X" pattern (some older emails).
    m = re.search(r"Tax\s+Invoice\s+for\s+(.+?)\s+(?:SHARES|UNITS)\s*:", text, re.IGNORECASE)
    if m:
        return m.group(1).strip(" -–—:") or None

    # Last resort: whatever appears immediately before TRADED N:
    m = re.search(r"([A-Z][\w &./'\-]+?)\s+TRADED\s+\d+\s*:", text)
    if m:
        return _dedupe_repeated(m.group(1).strip()) or None

    return None


def _strip_lead_noise(s: str) -> str:
    """Drop leading badge tokens like 'AMETF', 'EasyETFs' that aren't part of the name."""
    words = s.split()
    while words and words[0].upper() in _LEAD_NOISE:
        words.pop(0)
    return " ".join(words)


def _dedupe_repeated(s: str) -> str:
    """If 's' is 'X X' (the same phrase twice), return 'X'."""
    words = s.split()
    n = len(words)
    if n >= 4 and n % 2 == 0:
        half = n // 2
        if [w.lower() for w in words[:half]] == [w.lower() for w in words[half:]]:
            return " ".join(words[:half])
    return s


# Quantity: SHARES and FSRs are split across header + data rows; after HTML strip
# they become 'SHARES FSRs 7431 .6290'. Some older emails used 'SHARES: 7431 FSRs: .6290'.
def _extract_quantity(text: str) -> float | None:
    # New format: "SHARES FSRs 7431 .6290" (with optional units variant)
    m = re.search(
        r"\b(?:SHARES|UNITS)\s+FSRs?\s+([\d,]+)\s+\.?(\d+)\b",
        text,
        re.IGNORECASE,
    )
    if m:
        whole = m.group(1).replace(",", "")
        frac = m.group(2)
        try:
            return float(f"{whole}.{frac}")
        except ValueError:
            return None

    # Legacy format with colons: "SHARES: 7431 FSRs: .6290"
    m = re.search(
        r"(?:SHARES|UNITS)\s*:\s*([\d,]+)\s+FSRs?\s*:\s*\.?(\d+)",
        text,
        re.IGNORECASE,
    )
    if m:
        whole = m.group(1).replace(",", "")
        frac = m.group(2)
        try:
            return float(f"{whole}.{frac}")
        except ValueError:
            return None

    # SHARES alone (no fractional part)
    m = re.search(r"(?:SHARES|UNITS)\s*:?\s*([\d,]+(?:\.\d+)?)", text, re.IGNORECASE)
    if m:
        try:
            return float(m.group(1).replace(",", ""))
        except ValueError:
            return None
    return None


def _extract_trade_price(text: str) -> float | None:
    # Allow optional 'R' / '$' / 'USD' / 'ZAR' currency prefix and whitespace.
    m = re.search(
        r"TRADE\s+PRICE\s*:\s*(?:R|ZAR|USD|\$)?\s*([\d,]+(?:\.\d+)?)",
        text,
        re.IGNORECASE,
    )
    if not m:
        return None
    try:
        return float(m.group(1).replace(",", ""))
    except ValueError:
        return None


def _extract_trade_value(text: str) -> float | None:
    """TRADE VALUE = gross before fees. Cleaner than computing quantity*price."""
    m = re.search(
        r"TRADE\s+VALUE\s+(?:R|ZAR|USD|\$)?\s*([\d,]+(?:\.\d+)?)",
        text,
        re.IGNORECASE,
    )
    if not m:
        return None
    try:
        return float(m.group(1).replace(",", ""))
    except ValueError:
        return None


def _extract_total_cost(text: str) -> float | None:
    """Buy emails show TOTAL COST; sell emails show TOTAL PROCEEDS / NET PROCEEDS."""
    for label in ("TOTAL\\s+COST", "TOTAL\\s+PROCEEDS", "NET\\s+PROCEEDS", "NET\\s+PAYOUT"):
        m = re.search(rf"{label}\s+(?:R|ZAR|USD|\$)?\s*([\d,]+(?:\.\d+)?)", text, re.IGNORECASE)
        if m:
            try:
                return float(m.group(1).replace(",", ""))
            except ValueError:
                continue
    return None


def _extract_action(*, text: str, alt_text: str, raw_html: str) -> str:
    """
    Multi-signal buy/sell detection:
      1. Image alt text on the badge ("buy" / "sell")
      2. "tax invoice buy" / "tax invoice sell" in stripped text
      3. Verb-level: BOUGHT, SOLD, PURCHASED
      4. Invoice-row inference: TOTAL PROCEEDS / NET PROCEEDS = sell
    Default to 'buy' (the common case on EE) if nothing matches.
    """
    alt_low = (alt_text or "").lower()
    if "sell" in alt_low or "sold" in alt_low:
        return "sell"
    if "buy" in alt_low or "bought" in alt_low:
        return "buy"

    # Some templates use class names instead of alt — quick raw HTML peek.
    if re.search(r'(?:class|alt)\s*=\s*["\'][^"\']*sell', raw_html, re.IGNORECASE):
        return "sell"
    if re.search(r'(?:class|alt)\s*=\s*["\'][^"\']*\bbuy\b', raw_html, re.IGNORECASE):
        return "buy"

    if re.search(r"tax\s+invoice\s+(?:sell|sold)\b", text, re.IGNORECASE):
        return "sell"
    if re.search(r"tax\s+invoice\s+(?:buy|bought)\b", text, re.IGNORECASE):
        return "buy"

    if re.search(r"\b(SOLD|YOU\s+SOLD|SALE\s+OF|DISPOSAL)\b", text, re.IGNORECASE):
        return "sell"
    if re.search(r"\b(BOUGHT|YOU\s+BOUGHT|PURCHASED|PURCHASE\s+OF)\b", text, re.IGNORECASE):
        return "buy"

    if re.search(r"\b(NET\s+PROCEEDS|TOTAL\s+PROCEEDS|NET\s+PAYOUT)\b", text, re.IGNORECASE):
        return "sell"
    if re.search(r"\bTOTAL\s+COST\b", text, re.IGNORECASE):
        return "buy"

    return "buy"


def _extract_account_type(text: str) -> str:
    """Reads the 'Account: EasyEquities {TYPE}' line. Defaults to ZAR."""
    m = re.search(r"Account\s*:\s*EasyEquities\s+([A-Za-z]+)", text)
    if m:
        kind = m.group(1).upper()
        if kind in ("TFSA", "USD", "ZAR", "RA", "SATRIX", "EUR", "GBP", "AUD"):
            return kind
        return kind  # let unknown types pass through
    upper = text.upper()
    if "TFSA" in upper:
        return "TFSA"
    if "USD" in upper or "DOLLAR" in upper:
        return "USD"
    return "ZAR"


def _extract_submission_date(text: str) -> datetime | None:
    m = re.search(r"SUBMISSION\s+DATE\s*:\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})", text, re.IGNORECASE)
    if not m:
        return None
    try:
        return datetime.strptime(f"{m.group(1)} {m.group(2)}", "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return None


def _extract_invoice_number(text: str) -> str | None:
    m = re.search(r"INVOICE\s+NUMBER\s*:\s*#?(\w+)", text, re.IGNORECASE)
    return m.group(1) if m else None
