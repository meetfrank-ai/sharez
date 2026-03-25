import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from database import engine, Base
from routes import auth, portfolio, follow, theses, comments, feed, notes, discover, trades, stocks

# Create all tables
Base.metadata.create_all(bind=engine)

# Migrate: add new columns to existing tables
try:
    from sqlalchemy import text, inspect
    inspector = inspect(engine)

    migrations = {
        "users": [
            ("portfolio_imported_at", "ALTER TABLE users ADD COLUMN portfolio_imported_at TIMESTAMP"),
            ("handle", "ALTER TABLE users ADD COLUMN handle VARCHAR"),
            ("password_reset_token", "ALTER TABLE users ADD COLUMN password_reset_token VARCHAR"),
            ("password_reset_expires", "ALTER TABLE users ADD COLUMN password_reset_expires TIMESTAMP"),
        ],
        "notes": [
            ("transaction_ids", "ALTER TABLE notes ADD COLUMN transaction_ids JSONB"),
            ("image_url", "ALTER TABLE notes ADD COLUMN image_url VARCHAR"),
            ("reshare_count", "ALTER TABLE notes ADD COLUMN reshare_count INTEGER DEFAULT 0"),
            ("restacked_note_id", "ALTER TABLE notes ADD COLUMN restacked_note_id INTEGER"),
            ("trade_linked", "ALTER TABLE notes ADD COLUMN trade_linked BOOLEAN DEFAULT FALSE"),
        ],
    }

    with engine.connect() as conn:
        for table_name, columns in migrations.items():
            try:
                existing_cols = {c["name"] for c in inspector.get_columns(table_name)}
            except Exception:
                existing_cols = set()

            for col_name, col_sql in columns:
                if col_name not in existing_cols:
                    try:
                        conn.execute(text(col_sql))
                        conn.commit()
                        print(f"Migrated: added {col_name} to {table_name}")
                    except Exception as e:
                        conn.rollback()
                        print(f"Migration skip {col_name}: {e}")
    # Create indexes on frequently queried columns
    indexes = [
        "CREATE INDEX IF NOT EXISTS ix_follows_follower_id ON follows (follower_id)",
        "CREATE INDEX IF NOT EXISTS ix_follows_following_id ON follows (following_id)",
        "CREATE INDEX IF NOT EXISTS ix_follows_status ON follows (status)",
        "CREATE INDEX IF NOT EXISTS ix_notes_user_id ON notes (user_id)",
        "CREATE INDEX IF NOT EXISTS ix_holdings_user_id ON holdings (user_id)",
        "CREATE INDEX IF NOT EXISTS ix_user_transactions_user_id ON user_transactions (user_id)",
        "CREATE INDEX IF NOT EXISTS ix_trades_user_id ON trades (user_id)",
    ]
    with engine.connect() as conn:
        for idx_sql in indexes:
            try:
                conn.execute(text(idx_sql))
                conn.commit()
            except Exception:
                conn.rollback()
except Exception as e:
    print(f"Migration check: {e}")

# Seed database if empty (runs once on first deploy)
try:
    from database import SessionLocal
    from models import User
    _db = SessionLocal()
    if not _db.query(User).first():
        _db.close()
        print("Empty database — running seed...")
        import subprocess, sys
        subprocess.run([sys.executable, "seed.py"], check=True)
    else:
        _db.close()
except Exception as e:
    print(f"Seed check skipped: {e}")

# Seed instrument map if empty
try:
    from models import InstrumentMap
    _db = SessionLocal()
    try:
        existing = _db.query(InstrumentMap).first()
    except Exception:
        _db.rollback()
        existing = None  # Table might not exist yet
    if not existing:
        _seed_instruments = [
            # JSE stocks
            ("Prosus N.V", "PRX", "JSE", "stock", "PRX.JSE", "PRX.JO", None, None, "Technology"),
            ("Naspers Limited", "NPN", "JSE", "stock", "NPN.JSE", "NPN.JO", None, None, "Technology"),
            ("Naspers", "NPN", "JSE", "stock", "NPN.JSE", "NPN.JO", None, None, "Technology"),
            ("Capitec Bank Holdings Limited", "CPI", "JSE", "stock", "CPI.JSE", "CPI.JO", None, None, "Financials"),
            ("Capitec Bank", "CPI", "JSE", "stock", "CPI.JSE", "CPI.JO", None, None, "Financials"),
            ("Shoprite Holdings Limited", "SHP", "JSE", "stock", "SHP.JSE", "SHP.JO", None, None, "Consumer"),
            ("Shoprite", "SHP", "JSE", "stock", "SHP.JSE", "SHP.JO", None, None, "Consumer"),
            ("Standard Bank Group Limited", "SBK", "JSE", "stock", "SBK.JSE", "SBK.JO", None, None, "Financials"),
            ("Standard Bank", "SBK", "JSE", "stock", "SBK.JSE", "SBK.JO", None, None, "Financials"),
            ("MTN Group Limited", "MTN", "JSE", "stock", "MTN.JSE", "MTN.JO", None, None, "Telecoms"),
            ("MTN", "MTN", "JSE", "stock", "MTN.JSE", "MTN.JO", None, None, "Telecoms"),
            ("Discovery", "DSY", "JSE", "stock", "DSY.JSE", "DSY.JO", None, None, "Financials"),
            ("Absa Group", "ABG", "JSE", "stock", "ABG.JSE", "ABG.JO", None, None, "Financials"),
            ("Sanlam", "SLM", "JSE", "stock", "SLM.JSE", "SLM.JO", None, None, "Financials"),
            ("Woolworths", "WHL", "JSE", "stock", "WHL.JSE", "WHL.JO", None, None, "Consumer"),
            ("Sasol", "SOL", "JSE", "stock", "SOL.JSE", "SOL.JO", None, None, "Energy"),
            ("FirstRand", "FSR", "JSE", "stock", "FSR.JSE", "FSR.JO", None, None, "Financials"),
            ("Redefine Properties", "RDF", "JSE", "stock", "RDF.JSE", "RDF.JO", None, None, "Real Estate"),
            ("Clicks Group", "CLS", "JSE", "stock", "CLS.JSE", "CLS.JO", None, None, "Consumer"),
            # Established ETFs
            ("Satrix Top 40 ETF", "STX40", "JSE", "etf", "STX40.JSE", "STX40.JO", None, None, "Broad Market"),
            ("Satrix S&P 500 ETF", "STX500", "JSE", "etf", "STX500.JSE", "STX500.JO", None, None, "US Equity"),
            ("CoreShares S&P 500 ETF", "CSP500", "JSE", "etf", "CSP500.JSE", "CSP500.JO", None, None, "US Equity"),
            # AMETFs
            ("Allan Gray Orbis Global Equity Feeder AMETF", "AGOGE", "JSE", "ametf", "AGOGE.JSE", "AGOGE.JO", "allangray", "AGOGE", "Global Equity"),
            ("Coronation Global Emerging Markets Prescient Feeder AMETF", "CGEM", "JSE", "ametf", "CGEM.JSE", "CGEM.JO", "coronation", "CGEM", "Emerging Markets"),
            ("EasyETFs Global Equity Actively Managed ETF", "EASYGE", "JSE", "ametf", "EASYGE.JSE", "EASYGE.JO", "easyetfs", "easyge", "Global Equity"),
            # Unit trusts (no ticker, scrape only)
            ("36ONE BCI SA Equity Fund Class C", None, None, "unit_trust", None, None, "moneyweb", "36ONE", "SA Equity"),
            ("Merchant West SCI Value Fund", None, None, "unit_trust", None, None, "moneyweb", "MWSCI", "SA Value"),
            # US stocks
            ("Apple Inc", "AAPL", "US", "stock", "AAPL.US", "AAPL", None, None, "Technology"),
            ("Tesla Inc", "TSLA", "US", "stock", "TSLA.US", "TSLA", None, None, "Automotive"),
            ("NVIDIA Corporation", "NVDA", "US", "stock", "NVDA.US", "NVDA", None, None, "Technology"),
            ("Microsoft Corporation", "MSFT", "US", "stock", "MSFT.US", "MSFT", None, None, "Technology"),
        ]
        for name, ticker, market, itype, eodhd, yf, scrape_src, scrape_code, sector in _seed_instruments:
            _db.add(InstrumentMap(
                ee_name=name, ticker=ticker, market=market, instrument_type=itype,
                eodhd_symbol=eodhd, yfinance_symbol=yf, scrape_source=scrape_src,
                scrape_code=scrape_code, sector=sector, is_verified=True,
            ))
        _db.commit()
        print(f"Seeded {len(_seed_instruments)} instruments")
    _db.close()
except Exception as e:
    print(f"Instrument seed: {e}")

app = FastAPI(title="Sharez", description="Social investing for friends")

# CORS — allow the React frontend in dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "https://sharez.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(auth.router)
app.include_router(portfolio.router)
app.include_router(follow.router)
app.include_router(theses.router)
app.include_router(comments.router)
app.include_router(feed.router)
app.include_router(notes.router)
app.include_router(discover.router)
app.include_router(trades.router)
app.include_router(stocks.router)

# Serve built React frontend in production
STATIC_DIR = Path(__file__).parent / "static"

if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        # Serve static files if they exist, otherwise return index.html (SPA routing)
        file_path = STATIC_DIR / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(STATIC_DIR / "index.html")
else:
    @app.get("/")
    def root():
        return {"app": "Sharez", "status": "running", "note": "Frontend not built yet. Run: cd frontend && npm run build"}
