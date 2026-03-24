"""
AI-powered stock summaries using Claude API + yfinance market data.
Returns structured JSON for the rich stock detail card.
"""

import os
import json
import logging
from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import Session

from models import StockSummaryCache, Holding, Thesis, User, Follow, FollowStatus, InvestmentReason

logger = logging.getLogger(__name__)

CACHE_HOURS = 4


def _format_age(age: timedelta) -> str:
    """Format a timedelta as a human-readable string."""
    minutes = int(age.total_seconds() / 60)
    if minutes < 60:
        return f"{minutes}m ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours}h ago"
    return f"{hours // 24}d ago"


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
                # Skip cache if it's a fallback summary (API key wasn't set when cached)
                if "ANTHROPIC_API_KEY" in summary_data.get("risk_note", ""):
                    pass  # Regenerate
                else:
                    summary_data["community"] = _get_community_data(db, contract_code, stock_name, current_user_id)
                    summary_data["why_people_invest"] = _get_investment_reasons(db, contract_code)
                    summary_data["updated_ago"] = _format_age(age)
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
    summary_data["sparkline"] = market_data.get("sparkline", [])
    summary_data["sector"] = market_data.get("metrics", {}).get("sector", "Equities")
    summary_data["updated_ago"] = "Just now"

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
    """Pull price, metrics, and news from EODHD (primary) or yfinance (fallback)."""

    # Ticker mapping: stock_name → EODHD ticker (SYMBOL.XJSE)
    TICKER_MAP = {
        "Capitec Bank": "CPI.JSE", "Naspers": "NPN.JSE", "Standard Bank": "SBK.JSE",
        "Shoprite": "SHP.JSE", "MTN": "MTN.JSE", "Sasol": "SOL.JSE",
        "FirstRand": "FSR.JSE", "Discovery": "DSY.JSE", "Woolworths": "WHL.JSE",
        "Absa Group": "ABG.JSE", "Sanlam": "SLM.JSE", "Clicks Group": "CLS.JSE",
        "Redefine Properties": "RDF.JSE",
    }

    eodhd_key = os.getenv("EODHD_API_KEY")
    ticker = TICKER_MAP.get(stock_name, stock_name.replace(" ", "")[:3].upper() + ".JSE")

    if eodhd_key:
        return _fetch_eodhd(ticker, eodhd_key, stock_name)
    else:
        return _fetch_yfinance(stock_name)


def _fetch_eodhd(ticker: str, api_key: str, stock_name: str) -> dict:
    """Fetch market data from EODHD API."""
    import httpx

    base = "https://eodhd.com/api"
    price_info = {}
    metrics = {}
    news_items = []
    sparkline = []

    try:
        # Get latest price from EOD data (more reliable than real-time on free tier)
        from datetime import datetime as dt, timedelta as td
        end = dt.now().strftime("%Y-%m-%d")
        start = (dt.now() - td(days=7)).strftime("%Y-%m-%d")
        resp = httpx.get(f"{base}/eod/{ticker}", params={"api_token": api_key, "fmt": "json", "from": start, "to": end, "order": "d"}, timeout=10)
        if resp.status_code == 200:
            eod = resp.json()
            if isinstance(eod, list) and len(eod) >= 1:
                latest = eod[0]
                prev = eod[1] if len(eod) > 1 else latest
                close = latest.get("close", 0)
                prev_close = prev.get("close", close)
                change = close - prev_close
                change_pct = (change / prev_close * 100) if prev_close else 0
                # EODHD JSE prices are in cents — convert to rands
                price_info = {
                    "ticker": ticker,
                    "price": round(close / 100, 2),
                    "change": round(change / 100, 2),
                    "change_pct": round(change_pct, 2),
                    "prev_close": round(prev_close / 100, 2),
                    "high_52w": None,
                    "low_52w": None,
                }
    except Exception as e:
        logger.warning(f"EODHD quote failed for {ticker}: {e}")

    try:
        # Fundamentals
        resp = httpx.get(f"{base}/fundamentals/{ticker}", params={"api_token": api_key, "fmt": "json"}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            highlights = data.get("Highlights", {})
            valuation = data.get("Valuation", {})
            tech = data.get("Technicals", {})
            general = data.get("General", {})

            metrics = {
                "sector": general.get("Sector", "N/A"),
                "industry": general.get("Industry", "N/A"),
                "market_cap": highlights.get("MarketCapitalization"),
                "pe_ratio": highlights.get("PERatio"),
                "forward_pe": valuation.get("ForwardPE"),
                "dividend_yield": highlights.get("DividendYield"),
                "revenue_growth": highlights.get("QuarterlyRevenueGrowthYOY"),
                "profit_margin": highlights.get("ProfitMargin"),
                "roe": highlights.get("ReturnOnEquityTTM"),
                "debt_to_equity": tech.get("DebtToEquity"),
                "beta": tech.get("Beta"),
                "eps": highlights.get("EarningsShare"),
                "description": (general.get("Description") or "")[:500],
                "high_52w": tech.get("52WeekHigh"),
                "low_52w": tech.get("52WeekLow"),
            }
            # Update price_info with 52w from fundamentals
            if metrics.get("high_52w"):
                price_info["high_52w"] = metrics["high_52w"]
            if metrics.get("low_52w"):
                price_info["low_52w"] = metrics["low_52w"]
    except Exception as e:
        logger.warning(f"EODHD fundamentals failed for {ticker}: {e}")

    try:
        # Sparkline — last 1 year of EOD prices
        from datetime import datetime, timedelta
        end = datetime.now().strftime("%Y-%m-%d")
        start = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
        resp = httpx.get(f"{base}/eod/{ticker}", params={"api_token": api_key, "fmt": "json", "from": start, "to": end}, timeout=10)
        if resp.status_code == 200:
            eod_data = resp.json()
            if isinstance(eod_data, list):
                sparkline = [round(d.get("close", 0) / 100, 2) for d in eod_data if d.get("close")]
    except Exception as e:
        logger.warning(f"EODHD sparkline failed for {ticker}: {e}")

    try:
        # News
        symbol = ticker.split(".")[0]
        resp = httpx.get(f"{base}/news", params={"api_token": api_key, "s": ticker, "limit": 5, "fmt": "json"}, timeout=10)
        if resp.status_code == 200:
            news_data = resp.json()
            if isinstance(news_data, list):
                for n in news_data[:5]:
                    news_items.append({
                        "title": n.get("title", ""),
                        "publisher": n.get("source", ""),
                        "published": n.get("date", ""),
                    })
    except Exception as e:
        logger.warning(f"EODHD news failed for {ticker}: {e}")

    return {"price_info": price_info, "metrics": metrics, "news": news_items, "sparkline": sparkline}


def _fetch_yfinance(stock_name: str) -> dict:
    """Fallback: fetch market data from yfinance."""
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
            "dividend_yield": info.get("dividendYield"),
            "description": (info.get("longBusinessSummary") or "")[:500],
        }

        sparkline = []
        try:
            hist = ticker.history(period="1mo")
            if not hist.empty:
                sparkline = [round(p, 2) for p in hist["Close"].tolist()]
        except Exception:
            pass

        return {"price_info": price_info, "metrics": metrics, "news": [], "sparkline": sparkline}

    except Exception as e:
        logger.warning(f"yfinance failed for {stock_name}: {e}")
        return {"price_info": {}, "metrics": {}, "news": [], "sparkline": []}


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

    # Recent buys and sells (from FeedEvents in last 14 days)
    from models import FeedEvent, EventType
    from datetime import datetime, timezone, timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(days=14)

    recent_buys = (
        db.query(FeedEvent)
        .filter(
            FeedEvent.event_type == EventType.added_stock,
            FeedEvent.created_at >= cutoff,
        )
        .all()
    )
    recent_buys_count = sum(
        1 for e in recent_buys
        if e.metadata_ and e.metadata_.get("contract_code") == contract_code
    )

    recent_sells = (
        db.query(FeedEvent)
        .filter(
            FeedEvent.event_type == EventType.removed_stock,
            FeedEvent.created_at >= cutoff,
        )
        .all()
    )
    recent_sells_count = sum(
        1 for e in recent_sells
        if e.metadata_ and e.metadata_.get("contract_code") == contract_code
    )

    return {
        "total_holders": total_holders,
        "following_holders": following_holders,
        "avg_allocation_pct": avg_allocation,
        "recent_buys": recent_buys_count,
        "recent_sells": recent_sells_count,
    }


def _get_investment_reasons(db: Session, contract_code: str) -> list[dict]:
    """Aggregate investment reasons from explicit reasons + theses."""
    # Source 1: Explicit investment reasons (from "Why are you investing?" prompt)
    explicit_reasons = (
        db.query(InvestmentReason)
        .filter(InvestmentReason.contract_code == contract_code)
        .all()
    )

    reason_counts = {}
    total_sources = 0

    # Count explicit preset reasons
    for ir in explicit_reasons:
        total_sources += 1
        for reason in (ir.reasons or []):
            reason_counts[reason] = reason_counts.get(reason, 0) + 1

    # Source 2: Keyword extraction from theses (fallback/supplement)
    theses = (
        db.query(Thesis)
        .filter(Thesis.contract_code == contract_code)
        .all()
    )

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

    total = max(len(theses) + total_sources, 1)

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

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return _fallback_summary(stock_name, market_data)

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        metrics = market_data.get("metrics", {})
        price_info = market_data.get("price_info", {})
        news = market_data.get("news", [])
        sparkline = market_data.get("sparkline", [])

        news_text = "\n".join([f"- {n['title']}" for n in news[:5]]) if news else "No recent news available."

        # Calculate historical performance from sparkline
        perf_text = ""
        if sparkline and len(sparkline) > 5:
            current = sparkline[-1]
            # 1 month ago (approx 22 trading days)
            if len(sparkline) > 22:
                m1 = sparkline[-22]
                m1_chg = ((current - m1) / m1 * 100)
                perf_text += f"1-month change: {m1_chg:+.1f}%\n"
            # 3 months ago
            if len(sparkline) > 66:
                m3 = sparkline[-66]
                m3_chg = ((current - m3) / m3 * 100)
                perf_text += f"3-month change: {m3_chg:+.1f}%\n"
            # 6 months ago
            if len(sparkline) > 132:
                m6 = sparkline[-132]
                m6_chg = ((current - m6) / m6 * 100)
                perf_text += f"6-month change: {m6_chg:+.1f}%\n"
            # 1 year (full sparkline)
            y1 = sparkline[0]
            y1_chg = ((current - y1) / y1 * 100)
            perf_text += f"1-year change: {y1_chg:+.1f}%\n"
            # Year high/low from sparkline
            perf_text += f"Year high: R{max(sparkline):.2f}\nYear low: R{min(sparkline):.2f}\n"

        prompt = f"""You are a financial analyst writing for young South African investors on a social investing platform.

Stock: {stock_name}
Current price: R{price_info.get('price', 'N/A')}
Daily change: {price_info.get('change_pct', 'N/A')}%
Sector: {metrics.get('sector', 'N/A')}
P/E ratio: {metrics.get('pe_ratio', 'N/A')}
Market cap: {metrics.get('market_cap', 'N/A')}
Dividend yield: {metrics.get('dividend_yield', 'N/A')}
Revenue growth: {metrics.get('revenue_growth', 'N/A')}
ROE: {metrics.get('roe', 'N/A')}
Debt-to-equity: {metrics.get('debt_to_equity', 'N/A')}
EPS: {metrics.get('eps', 'N/A')}
Description: {metrics.get('description', 'N/A')}

Historical performance:
{perf_text if perf_text else 'No historical data available.'}

Note: Ignore community/holder count data for your analysis — focus only on financial fundamentals, price action, and news.

Recent news:
{news_text}

Return a JSON object with these exact fields:

{{
  "quick_take": "2-3 sentence summary covering what the stock has been doing recently AND over the past year. Mention specific percentage moves (e.g. 'up 15% this year but down 8% in the last month'). Write for a 25-year-old casual investor.",
  "sentiment_tags": [
    {{"label": "tag text", "type": "positive|caution|neutral"}}
  ],
  "key_metrics": [
    {{"label": "metric name", "value": "formatted value"}}
  ],
  "news_digest": [
    {{"time": "relative time like '2h' or '1d'", "headline": "rewritten headline in plain language"}}
  ],
  "risk_note": "The single biggest FINANCIAL risk for someone buying this stock today. Focus on: valuation (P/E vs sector), debt levels, geopolitical exposure, regulatory risk, earnings decline, currency risk, or sector headwinds. Be specific and cite a number. Do NOT mention community size or number of holders — that's platform data, not a financial risk."
}}

Rules:
- sentiment_tags: 2-4 tags. Include community sentiment (bullish/bearish/mixed based on holder count), plus 1-2 thematic tags (AI play, near 52w high, dividend play, etc). Type maps to color: positive=green, caution=amber, neutral=blue.
- key_metrics: Pick the 3 most relevant metrics for THIS stock. Format values nicely (e.g. "R45.2B" for market cap, "14.3x" for P/E, "3.2%" for dividend yield). Use ZAR where relevant.
- news_digest: Rewrite the headlines in plain language. If no news, return empty array.
- risk_note: Always surface something — even for beloved stocks. If valuation is stretched, say so. If there's geopolitical risk, flag it.
- Write in a warm, conversational tone. No jargon.

Return ONLY the JSON object, no markdown or explanation."""

        message = client.messages.create(
            model="claude-sonnet-4-20250514",
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
