"""AI-powered stock summaries using Claude API."""

import os
import logging
from datetime import datetime, timezone, timedelta

import anthropic
from sqlalchemy.orm import Session

from models import StockSummaryCache

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
CACHE_HOURS = 24


async def get_stock_summary(db: Session, contract_code: str, stock_name: str) -> str:
    """Get an AI summary for a stock, using cache if available."""

    # Check cache
    cached = (
        db.query(StockSummaryCache)
        .filter(StockSummaryCache.contract_code == contract_code)
        .first()
    )

    if cached and cached.generated_at:
        age = datetime.now(timezone.utc) - cached.generated_at.replace(tzinfo=timezone.utc)
        if age < timedelta(hours=CACHE_HOURS):
            return cached.summary_text

    # Fetch market data for context
    market_context = _get_yahoo_finance_data(stock_name)

    # Generate summary with Claude
    summary = await _generate_summary(stock_name, market_context)

    # Cache the result
    if cached:
        cached.summary_text = summary
        cached.generated_at = datetime.now(timezone.utc)
    else:
        db.add(StockSummaryCache(
            contract_code=contract_code,
            summary_text=summary,
            generated_at=datetime.now(timezone.utc),
        ))
    db.commit()

    return summary


def _get_yahoo_finance_data(stock_name: str) -> str:
    """Pull basic stock info from Yahoo Finance for JSE stocks."""
    try:
        import yfinance as yf

        # Map common SA stocks to Yahoo Finance tickers
        ticker_map = {
            "Capitec Bank": "CPI.JO",
            "Naspers": "NPN.JO",
            "Standard Bank": "SBK.JO",
            "Shoprite": "SHP.JO",
            "MTN": "MTN.JO",
            "Sasol": "SOL.JO",
            "FirstRand": "FSR.JO",
            "Discovery": "DSY.JO",
            "Woolworths": "WHL.JO",
            "Absa": "ABG.JO",
        }

        ticker_symbol = ticker_map.get(stock_name)
        if not ticker_symbol:
            # Try appending .JO
            ticker_symbol = stock_name.replace(" ", "").upper()[:3] + ".JO"

        ticker = yf.Ticker(ticker_symbol)
        info = ticker.info

        return (
            f"Ticker: {ticker_symbol}\n"
            f"Sector: {info.get('sector', 'N/A')}\n"
            f"Industry: {info.get('industry', 'N/A')}\n"
            f"Market Cap: {info.get('marketCap', 'N/A')}\n"
            f"P/E Ratio: {info.get('trailingPE', 'N/A')}\n"
            f"52-Week High: {info.get('fiftyTwoWeekHigh', 'N/A')}\n"
            f"52-Week Low: {info.get('fiftyTwoWeekLow', 'N/A')}\n"
            f"Dividend Yield: {info.get('dividendYield', 'N/A')}\n"
            f"Description: {info.get('longBusinessSummary', 'N/A')[:500]}"
        )
    except Exception as e:
        logger.warning(f"Yahoo Finance lookup failed for {stock_name}: {e}")
        return f"No market data available for {stock_name}"


async def _generate_summary(stock_name: str, market_context: str) -> str:
    """Generate a plain-language stock summary using Claude."""
    if not ANTHROPIC_API_KEY:
        return (
            f"**{stock_name}** — AI summary unavailable. "
            "Set the ANTHROPIC_API_KEY environment variable to enable AI summaries."
        )

    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

        message = client.messages.create(
            model="claude-sonnet-4-6-20250514",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"Give me a plain-language investment summary for the JSE-listed stock: {stock_name}.\n\n"
                        f"Here is some market data:\n{market_context}\n\n"
                        "Write 3-4 short paragraphs suitable for a retail investor in South Africa. "
                        "Cover: what the company does, recent performance, key metrics, and any notable risks or opportunities. "
                        "Keep it conversational — no jargon. Use ZAR where relevant."
                    ),
                }
            ],
        )

        return message.content[0].text

    except Exception as e:
        logger.error(f"Claude API call failed: {e}")
        return f"**{stock_name}** — AI summary temporarily unavailable."
