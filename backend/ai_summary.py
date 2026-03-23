"""
AI-powered stock summaries using Claude API + yfinance market data.
Returns structured JSON for the rich stock detail card.
"""

import os
import json
import logging
from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import Session

from models import StockSummaryCache, Holding, Thesis, User, Follow, FollowStatus

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
CACHE_HOURS = 4


async def get_stock_summary(db: Session, contract_code: str, stock_name: str, current_user_id: int = None) -> dict:
    """Get a rich AI summary for a stock. Returns structured data."""

    # Check cache
    cached = (
        db.query(StockSummaryCache)
        .filter(StockSummaryCache.contract_code == contract_code)
        .first()
    )

    if cached and cached.generated_at:
        age = datetime.now(timezone.utc) - cached.generated_at.replace(tzinfo=timezone.utc)
        if age < timedelta(hours=CACHE_HOURS):
            try:
                summary_data = json.loads(cached.summary_text)
                # Always refresh community data (it's cheap)
                summary_data["community"] = _get_community_data(db, contract_code, stock_name, current_user_id)
                summary_data["why_people_invest"] = _get_investment_reasons(db, contract_code)
                return summary_data
            except json.JSONDecodeError:
                pass  # Stale format, regenerate

    # Fetch market data
    market_data = _get_market_data(stock_name)

    # Get community data from platform
    community = _get_community_data(db, contract_code, stock_name, current_user_id)
    why_invest = _get_investment_reasons(db, contract_code)

    # Generate AI summary
    summary_data = await _generate_structured_summary(stock_name, market_data, community)
    summary_data["community"] = community
    summary_data["why_people_invest"] = why_invest
    summary_data["market_data"] = market_data.get("price_info", {})

    # Cache the AI-generated parts (not community data, which is dynamic)
    cache_data = {k: v for k, v in summary_data.items() if k not in ("community", "why_people_invest")}

    if cached:
        cached.summary_text = json.dumps(cache_data)
        cached.generated_at = datetime.now(timezone.utc)
    else:
        db.add(StockSummaryCache(
            contract_code=contract_code,
            summary_text=json.dumps(cache_data),
            generated_at=datetime.now(timezone.utc),
        ))
    db.commit()

    return summary_data


def _get_market_data(stock_name: str) -> dict:
    """Pull price, metrics, and news from yfinance."""
    try:
        import yfinance as yf

        ticker_map = {
            "Capitec Bank": "CPI.JO", "Naspers": "NPN.JO", "Standard Bank": "SBK.JO",
            "Shoprite": "SHP.JO", "MTN": "MTN.JO", "Sasol": "SOL.JO",
            "FirstRand": "FSR.JO", "Discovery": "DSY.JO", "Woolworths": "WHL.JO",
            "Absa Group": "ABG.JO", "Sanlam": "SLM.JO", "Clicks Group": "CLS.JO",
            "Redefine Properties": "RDF.JO",
        }

        ticker_symbol = ticker_map.get(stock_name, stock_name.replace(" ", "")[:3].upper() + ".JO")
        ticker = yf.Ticker(ticker_symbol)
        info = ticker.info

        price_info = {
            "ticker": ticker_symbol,
            "price": info.get("currentPrice") or info.get("regularMarketPrice"),
            "change": info.get("regularMarketChange"),
            "change_pct": info.get("regularMarketChangePercent"),
            "prev_close": info.get("previousClose"),
            "high_52w": info.get("fiftyTwoWeekHigh"),
            "low_52w": info.get("fiftyTwoWeekLow"),
        }

        metrics = {
            "sector": info.get("sector", "N/A"),
            "industry": info.get("industry", "N/A"),
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE"),
            "forward_pe": info.get("forwardPE"),
            "dividend_yield": info.get("dividendYield"),
            "revenue_growth": info.get("revenueGrowth"),
            "profit_margin": info.get("profitMargins"),
            "roe": info.get("returnOnEquity"),
            "debt_to_equity": info.get("debtToEquity"),
            "beta": info.get("beta"),
            "eps": info.get("trailingEps"),
            "description": (info.get("longBusinessSummary") or "")[:500],
        }

        # Get recent news
        news_items = []
        try:
            news = ticker.news[:5] if hasattr(ticker, 'news') else []
            for n in news:
                news_items.append({
                    "title": n.get("title", ""),
                    "publisher": n.get("publisher", ""),
                    "published": n.get("providerPublishTime", 0),
                })
        except Exception:
            pass

        return {"price_info": price_info, "metrics": metrics, "news": news_items}

    except Exception as e:
        logger.warning(f"yfinance failed for {stock_name}: {e}")
        return {"price_info": {}, "metrics": {}, "news": []}


def _get_community_data(db: Session, contract_code: str, stock_name: str, current_user_id: int = None) -> dict:
    """Get platform community stats for a stock."""
    # Total holders
    total_holders = (
        db.query(Holding.user_id)
        .filter(Holding.contract_code == contract_code)
        .distinct()
        .count()
    )

    # Holders among people the current user follows
    following_holders = []
    if current_user_id:
        following_ids = [
            f[0] for f in
            db.query(Follow.following_id)
            .filter(Follow.follower_id == current_user_id, Follow.status == FollowStatus.active)
            .all()
        ]

        if following_ids:
            holders = (
                db.query(User)
                .join(Holding, Holding.user_id == User.id)
                .filter(Holding.contract_code == contract_code, User.id.in_(following_ids))
                .all()
            )
            following_holders = [
                {"id": u.id, "display_name": u.display_name, "handle": u.handle}
                for u in holders
            ]

    # Average allocation among holders
    holdings = db.query(Holding).filter(Holding.contract_code == contract_code).all()
    avg_allocation = 0
    if holdings:
        allocations = []
        for h in holdings:
            user_total = sum(
                (uh.current_value or 0)
                for uh in db.query(Holding).filter(Holding.user_id == h.user_id).all()
            )
            if user_total > 0 and h.current_value:
                allocations.append((h.current_value / user_total) * 100)
        if allocations:
            avg_allocation = round(sum(allocations) / len(allocations), 1)

    return {
        "total_holders": total_holders,
        "following_holders": following_holders,
        "avg_allocation_pct": avg_allocation,
    }


def _get_investment_reasons(db: Session, contract_code: str) -> list[dict]:
    """Aggregate investment reasons from theses on this stock."""
    theses = (
        db.query(Thesis)
        .filter(Thesis.contract_code == contract_code)
        .all()
    )

    if not theses:
        return []

    # Simple keyword-based reason extraction
    reason_keywords = {
        "Growth potential": ["growth", "growing", "expand", "momentum", "upside"],
        "Dividend income": ["dividend", "income", "yield", "passive"],
        "Undervalued": ["undervalued", "discount", "cheap", "value", "compelling"],
        "Strong brand": ["brand", "moat", "dominant", "leader", "market share"],
        "Innovation": ["innovat", "technology", "ai", "digital", "disrupt"],
        "Stable earnings": ["stable", "consistent", "reliable", "defensive"],
        "Africa growth": ["africa", "continent", "emerging", "frontier"],
        "Management quality": ["management", "leadership", "governance", "ceo"],
    }

    reason_counts = {}
    total = len(theses)

    for thesis in theses:
        body_lower = thesis.body.lower()
        matched = set()
        for reason, keywords in reason_keywords.items():
            if any(kw in body_lower for kw in keywords):
                matched.add(reason)
        for reason in matched:
            reason_counts[reason] = reason_counts.get(reason, 0) + 1

    if not reason_counts:
        return []

    # Convert to percentages and sort
    results = [
        {"reason": reason, "pct": round((count / total) * 100)}
        for reason, count in reason_counts.items()
    ]
    results.sort(key=lambda x: x["pct"], reverse=True)
    return results[:5]


async def _generate_structured_summary(stock_name: str, market_data: dict, community: dict) -> dict:
    """Generate structured AI summary using Claude."""

    if not ANTHROPIC_API_KEY:
        return _fallback_summary(stock_name, market_data)

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

        metrics = market_data.get("metrics", {})
        price_info = market_data.get("price_info", {})
        news = market_data.get("news", [])

        news_text = "\n".join([f"- {n['title']}" for n in news[:5]]) if news else "No recent news available."

        prompt = f"""You are a financial analyst writing for young South African investors on a social investing platform.

Stock: {stock_name}
Current price: {price_info.get('price', 'N/A')}
Change: {price_info.get('change_pct', 'N/A')}%
52-week high: {price_info.get('high_52w', 'N/A')}
52-week low: {price_info.get('low_52w', 'N/A')}
Sector: {metrics.get('sector', 'N/A')}
P/E ratio: {metrics.get('pe_ratio', 'N/A')}
Market cap: {metrics.get('market_cap', 'N/A')}
Dividend yield: {metrics.get('dividend_yield', 'N/A')}
Revenue growth: {metrics.get('revenue_growth', 'N/A')}
ROE: {metrics.get('roe', 'N/A')}
Debt-to-equity: {metrics.get('debt_to_equity', 'N/A')}
Description: {metrics.get('description', 'N/A')}
Community: {community.get('total_holders', 0)} people hold this stock

Recent news:
{news_text}

Return a JSON object with these exact fields:

{{
  "quick_take": "2-3 sentence plain-language summary of what's happening with this stock right now. Write for a 25-year-old casual investor.",
  "sentiment_tags": [
    {{"label": "tag text", "type": "positive|caution|neutral"}}
  ],
  "key_metrics": [
    {{"label": "metric name", "value": "formatted value"}}
  ],
  "news_digest": [
    {{"time": "relative time like '2h' or '1d'", "headline": "rewritten headline in plain language"}}
  ],
  "risk_note": "The single biggest risk for someone buying this stock today. Be specific and cite a number if possible."
}}

Rules:
- sentiment_tags: 2-4 tags. Include community sentiment (bullish/bearish/mixed based on holder count), plus 1-2 thematic tags (AI play, near 52w high, dividend play, etc). Type maps to color: positive=green, caution=amber, neutral=blue.
- key_metrics: Pick the 3 most relevant metrics for THIS stock. Format values nicely (e.g. "R45.2B" for market cap, "14.3x" for P/E, "3.2%" for dividend yield). Use ZAR where relevant.
- news_digest: Rewrite the headlines in plain language. If no news, return empty array.
- risk_note: Always surface something — even for beloved stocks. If valuation is stretched, say so. If there's geopolitical risk, flag it.
- Write in a warm, conversational tone. No jargon.

Return ONLY the JSON object, no markdown or explanation."""

        message = client.messages.create(
            model="claude-sonnet-4-6-20250514",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )

        response_text = message.content[0].text.strip()
        # Clean up potential markdown wrapping
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1]
            if response_text.endswith("```"):
                response_text = response_text[:-3]

        return json.loads(response_text)

    except Exception as e:
        logger.error(f"Claude API call failed for {stock_name}: {e}")
        return _fallback_summary(stock_name, market_data)


def _fallback_summary(stock_name: str, market_data: dict) -> dict:
    """Fallback summary when Claude API is unavailable."""
    metrics = market_data.get("metrics", {})
    price_info = market_data.get("price_info", {})

    key_metrics = []
    if metrics.get("pe_ratio"):
        key_metrics.append({"label": "P/E ratio", "value": f"{metrics['pe_ratio']:.1f}x"})
    if metrics.get("market_cap"):
        cap = metrics["market_cap"]
        if cap >= 1e12:
            key_metrics.append({"label": "Market cap", "value": f"R{cap/1e12:.1f}T"})
        elif cap >= 1e9:
            key_metrics.append({"label": "Market cap", "value": f"R{cap/1e9:.1f}B"})
        else:
            key_metrics.append({"label": "Market cap", "value": f"R{cap/1e6:.0f}M"})
    if metrics.get("dividend_yield"):
        key_metrics.append({"label": "Div yield", "value": f"{metrics['dividend_yield']*100:.1f}%"})

    return {
        "quick_take": f"{stock_name} is a {metrics.get('sector', 'JSE-listed')} stock. Connect your Anthropic API key in Render to get AI-powered summaries with sentiment analysis, risk notes, and news digests.",
        "sentiment_tags": [{"label": "Data available", "type": "neutral"}],
        "key_metrics": key_metrics[:3] if key_metrics else [{"label": "No data", "value": "—"}],
        "news_digest": [],
        "risk_note": "AI summary unavailable — set ANTHROPIC_API_KEY to enable rich stock analysis.",
    }
