from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, Holding, Tier, InvestmentReason, FeedEvent, EventType, Note, StockFollow
from schemas import HoldingOut, EECredentials, TierConfigUpdate, TierConfigOut, InvestmentReasonCreate, InvestmentReasonOut, ShareTransactionRequest, StockFollowOut
from auth import get_current_user
from ee_sync import store_ee_credentials, sync_portfolio
from tier_access import get_access_tier

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


@router.post("/connect-ee")
async def connect_easy_equities(
    creds: EECredentials,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    store_ee_credentials(db, user, creds.ee_username, creds.ee_password)
    result = await sync_portfolio(db, user)
    return {"message": "EasyEquities connected and portfolio synced", "added_stocks": result.get("added_stocks", [])}


@router.post("/sync")
async def trigger_sync(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = await sync_portfolio(db, user)
    return {"message": "Portfolio synced", "added_stocks": result.get("added_stocks", [])}


@router.get("/me", response_model=list[HoldingOut])
def get_my_holdings(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    holdings = db.query(Holding).filter(Holding.user_id == user.id).all()

    # Auto-refresh prices if stale (older than 1 hour)
    if holdings:
        from datetime import datetime, timezone, timedelta
        oldest_sync = min((h.last_synced_at for h in holdings if h.last_synced_at), default=None)
        if oldest_sync:
            age = datetime.now(timezone.utc) - oldest_sync.replace(tzinfo=timezone.utc)
            if age > timedelta(hours=1):
                try:
                    from ee_import import refresh_user_prices
                    refresh_user_prices(db, user)
                    holdings = db.query(Holding).filter(Holding.user_id == user.id).all()
                except Exception:
                    pass

    return holdings


@router.post("/refresh-prices")
def refresh_prices(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Force refresh all holdings prices using the waterfall resolver."""
    from ee_import import refresh_user_prices
    refresh_user_prices(db, user)
    holdings = db.query(Holding).filter(Holding.user_id == user.id).all()
    return [{
        "stock_name": h.stock_name,
        "purchase_value": h.purchase_value,
        "current_value": h.current_value,
        "current_price": h.current_price,
        "updated": h.last_synced_at is not None,
    } for h in holdings]


@router.get("/user/{user_id}", response_model=list[HoldingOut])
def get_user_holdings(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    is_self = current_user.id == user_id
    access = get_access_tier(db, current_user.id, user_id)
    config = target.tier_config

    holdings = db.query(Holding).filter(Holding.user_id == user_id).all()

    # Self-view: return everything unmodified
    if is_self:
        return holdings

    if not config:
        return []

    # Determine what to show based on tier access
    if access == Tier.vault:
        shows = config.vault_shows or []
    elif access == Tier.inner_circle:
        shows = config.inner_circle_shows or []
    else:
        shows = config.public_shows or []

    show_stocks = "stock_names" in shows or "amounts" in shows or "allocation_pct" in shows
    if not show_stocks and "sectors" not in shows:
        return []

    show_allocation = "allocation_pct" in shows or "amounts" in shows

    total_value = sum(h.current_value or 0 for h in holdings)

    # Sort by current_value DESC for top-N logic and weight calculation
    holdings_sorted = sorted(holdings, key=lambda h: h.current_value or 0, reverse=True)

    # Public tier: only return top 5 holdings
    if access == Tier.public:
        holdings_sorted = holdings_sorted[:5]

    result = []
    for h in holdings_sorted:
        out = HoldingOut.model_validate(h)

        # Never expose rand amounts to other users — only percentages
        weight_pct = round((h.current_value / total_value) * 100, 2) if (total_value > 0 and h.current_value) else None
        pnl_pct = round(((h.current_value - h.purchase_value) / h.purchase_value) * 100, 2) if (h.purchase_value and h.current_value and h.purchase_value > 0) else None

        out.purchase_value = None
        out.current_price = None
        out.shares = None
        out.current_value = weight_pct if show_allocation else None

        result.append(out)

    return result


@router.put("/tier-config", response_model=TierConfigOut)
def update_tier_config(
    data: TierConfigUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    config = user.tier_config
    if not config:
        raise HTTPException(status_code=404, detail="Tier config not found")

    if data.public_shows is not None:
        config.public_shows = data.public_shows
    if data.inner_circle_shows is not None:
        config.inner_circle_shows = data.inner_circle_shows
    if data.vault_shows is not None:
        config.vault_shows = data.vault_shows
    if data.vault_price_cents is not None:
        config.vault_price_cents = data.vault_price_cents
    if data.auto_accept_followers is not None:
        config.auto_accept_followers = data.auto_accept_followers

    db.commit()
    db.refresh(config)
    return config


@router.get("/tier-config", response_model=TierConfigOut)
def get_tier_config(
    user: User = Depends(get_current_user),
):
    if not user.tier_config:
        raise HTTPException(status_code=404, detail="Tier config not found")
    return user.tier_config


# v2: InvestmentReason endpoints — not yet called by the frontend.
@router.post("/investment-reason", response_model=InvestmentReasonOut, status_code=201)
def save_investment_reason(
    data: InvestmentReasonCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save why a user invested in a stock. (v2 — not yet used by frontend)"""
    # Upsert — update if already exists for this user+stock
    existing = (
        db.query(InvestmentReason)
        .filter(InvestmentReason.user_id == user.id, InvestmentReason.contract_code == data.contract_code)
        .first()
    )
    if existing:
        existing.reasons = data.reasons
        existing.free_text = data.free_text
        db.commit()
        db.refresh(existing)
        return existing

    reason = InvestmentReason(
        user_id=user.id,
        contract_code=data.contract_code,
        stock_name=data.stock_name,
        reasons=data.reasons,
        free_text=data.free_text,
    )
    db.add(reason)
    db.commit()
    db.refresh(reason)
    return reason


# v2: not yet called by frontend.
@router.delete("/investment-reason/{contract_code}")
def delete_investment_reason(
    contract_code: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reason = db.query(InvestmentReason).filter(
        InvestmentReason.user_id == user.id, InvestmentReason.contract_code == contract_code
    ).first()
    if not reason:
        return {"message": "Not found"}
    db.delete(reason)
    db.commit()
    return {"message": "Deleted"}


@router.post("/follow-stock/{contract_code}")
def follow_stock(
    contract_code: str,
    stock_name: str = "",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(StockFollow).filter(
        StockFollow.user_id == user.id, StockFollow.contract_code == contract_code
    ).first()
    if existing:
        return {"message": "Already following", "id": existing.id}

    sf = StockFollow(user_id=user.id, contract_code=contract_code, stock_name=stock_name)
    db.add(sf)
    db.commit()
    db.refresh(sf)
    return {"message": "Stock followed", "id": sf.id}


@router.delete("/follow-stock/{contract_code}")
def unfollow_stock(
    contract_code: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sf = db.query(StockFollow).filter(
        StockFollow.user_id == user.id, StockFollow.contract_code == contract_code
    ).first()
    if not sf:
        return {"message": "Not following"}
    db.delete(sf)
    db.commit()
    return {"message": "Stock unfollowed"}


@router.get("/followed-stocks", response_model=list[StockFollowOut])
def get_followed_stocks(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(StockFollow)
        .filter(StockFollow.user_id == user.id)
        .order_by(StockFollow.stock_name.asc())
        .all()
    )


@router.get("/followed-stocks/{user_id}", response_model=list[StockFollowOut])
def get_user_followed_stocks(
    user_id: int,
    db: Session = Depends(get_db),
):
    return (
        db.query(StockFollow)
        .filter(StockFollow.user_id == user_id)
        .order_by(StockFollow.stock_name.asc())
        .all()
    )


@router.post("/share-transaction")
def share_transaction(
    data: ShareTransactionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """User explicitly shares a buy/sell transaction, with optional note."""
    event_type = EventType.added_stock if data.transaction_type == "buy" else EventType.removed_stock

    # Create the FeedEvent (now user-initiated, not auto)
    note_id = None
    if data.note:
        note = Note(
            user_id=user.id,
            body=data.note,
            visibility=Tier.public,
            stock_tag=data.contract_code,
            stock_name=data.stock_name,
        )
        db.add(note)
        db.flush()
        note_id = note.id

    feed_event = FeedEvent(
        user_id=user.id,
        event_type=event_type,
        visibility=Tier.public,
        note_id=note_id,
        metadata_={"stock_name": data.stock_name, "contract_code": data.contract_code},
    )
    db.add(feed_event)
    db.commit()

    return {"message": "Transaction shared", "note_id": note_id}


@router.post("/import-transactions")
async def import_transactions(
    file: UploadFile = File(...),
    account_type: str = Form("ZAR"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Import transactions from EasyEquities XLSX. Verifies, stores, and rebuilds holdings."""
    from ee_import import parse_transaction_xlsx, import_transactions_to_db, verify_ee_xlsx

    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Please upload an Excel file (.xlsx)")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    # Verify file is genuinely from EasyEquities
    verification = verify_ee_xlsx(contents)

    try:
        parsed = parse_transaction_xlsx(contents)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    result = import_transactions_to_db(db, user, parsed, account_type)

    # Update timestamps and verification score
    from datetime import datetime as dt, timezone as tz
    user.portfolio_imported_at = dt.now(tz.utc)
    db.commit()

    return {
        "message": result["message"],
        "holdings_imported": result["count"],
        "verification": verification,
        "new_transactions": result["new_count"],
        "stocks": result.get("stocks", []),
        "transactions_found": result["total_transactions"],
    }


@router.get("/transactions")
def get_my_transactions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all your transactions, sorted by date."""
    from models import UserTransaction
    txs = (
        db.query(UserTransaction)
        .filter(UserTransaction.user_id == user.id)
        .order_by(UserTransaction.transaction_date.desc())
        .all()
    )
    return [{
        "id": t.id,
        "action": t.action,
        "stock_name": t.stock_name,
        "contract_code": t.contract_code,
        "account_type": t.account_type,
        "quantity": t.quantity,
        "price": t.price,
        "transaction_date": str(t.transaction_date)[:10] if t.transaction_date else None,
        "shared_count": t.shared_count,
        "created_at": str(t.created_at),
    } for t in txs]


class ShareTransactionsBody(BaseModel):
    transaction_ids: list[int]
    visibility: str = "public"
    note_body: str = ""


@router.post("/transactions/share")
def share_transactions(
    data: ShareTransactionsBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Share one or more transactions as a note with tagged transactions."""
    from models import UserTransaction, Note, Tier

    transaction_ids = data.transaction_ids
    visibility = data.visibility
    note_body = data.note_body

    if not transaction_ids:
        raise HTTPException(status_code=400, detail="No transactions selected")

    # Verify all transactions belong to user
    txs = db.query(UserTransaction).filter(
        UserTransaction.id.in_(transaction_ids),
        UserTransaction.user_id == user.id,
    ).all()
    if len(txs) != len(transaction_ids):
        raise HTTPException(status_code=404, detail="Some transactions not found")

    vis = Tier(visibility)

    # Use first transaction's stock for the tag
    first_tx = txs[0]
    body = note_body.strip() if note_body else ""

    # Auto-generate body if empty
    if not body:
        if len(txs) == 1:
            body = f"{'Bought' if first_tx.action == 'buy' else 'Sold'} {first_tx.stock_name}"
        else:
            stocks = list(set(t.stock_name for t in txs))
            body = f"{'Bought' if first_tx.action == 'buy' else 'Traded'} {', '.join(stocks)}"

    note = Note(
        user_id=user.id,
        body=body,
        visibility=vis,
        stock_tag=first_tx.contract_code,
        stock_name=first_tx.stock_name,
        transaction_ids=[t.id for t in txs],
    )
    db.add(note)

    # Increment shared count on each transaction
    for tx in txs:
        tx.shared_count = (tx.shared_count or 0) + 1

    db.commit()
    db.refresh(note)

    return {"message": "Shared", "note_id": note.id}


@router.get("/transactions/by-ids")
def get_transactions_by_ids(
    ids: str = "",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get transaction details by IDs (for rendering in notes)."""
    from models import UserTransaction
    if not ids:
        return []
    id_list = [int(i) for i in ids.split(",") if i.strip().isdigit()]
    txs = db.query(UserTransaction).filter(UserTransaction.id.in_(id_list)).all()
    return [{
        "id": t.id,
        "action": t.action,
        "stock_name": t.stock_name,
        "account_type": t.account_type,
        "quantity": t.quantity,
        "transaction_date": str(t.transaction_date)[:10] if t.transaction_date else None,
    } for t in txs]


@router.post("/import-preview")
async def import_preview(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    """Preview what would be imported from an EE transaction history file."""
    from ee_import import parse_transaction_xlsx

    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Please upload an Excel file (.xlsx)")

    contents = await file.read()

    try:
        parsed = parse_transaction_xlsx(contents)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    return {
        "holdings": parsed["holdings"],
        "total_transactions": parsed["total_transactions"],
        "total_stocks": parsed["total_stocks"],
    }
