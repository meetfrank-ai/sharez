from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, Holding, Tier, InvestmentReason, FeedEvent, EventType, Note, StockFollow
from schemas import HoldingOut, TierConfigUpdate, TierConfigOut, InvestmentReasonCreate, InvestmentReasonOut, ShareTransactionRequest, StockFollowOut
from auth import get_current_user
from tier_access import get_access_tier

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


@router.get("/me", response_model=list[HoldingOut])
def get_my_holdings(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from models import UserTransaction
    from sqlalchemy import func
    holdings = db.query(Holding).filter(Holding.user_id == user.id).all()
    # Batch: trade counts per stock
    tc = dict(
        db.query(UserTransaction.stock_name, func.count())
        .filter(UserTransaction.user_id == user.id)
        .group_by(UserTransaction.stock_name).all()
    )
    for h in holdings:
        h.trade_count = tc.get(h.stock_name, 0)
    return holdings


@router.post("/refresh-prices")
def refresh_prices(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Force refresh all holdings prices using the waterfall resolver."""
    from ee_import import refresh_user_prices, _auto_map_instruments
    # Auto-map any unmapped holdings before refreshing prices
    stock_names = [h.stock_name for h in db.query(Holding).filter(Holding.user_id == user.id).all()]
    _auto_map_instruments(db, stock_names)
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

    from models import UserTransaction
    from sqlalchemy import func as sqlfunc
    holdings = db.query(Holding).filter(Holding.user_id == user_id).all()
    tc = dict(
        db.query(UserTransaction.stock_name, sqlfunc.count())
        .filter(UserTransaction.user_id == user_id)
        .group_by(UserTransaction.stock_name).all()
    )
    for h in holdings:
        h.trade_count = tc.get(h.stock_name, 0)

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
    if data.show_on_rank is not None:
        config.show_on_rank = data.show_on_rank

    db.commit()
    db.refresh(config)

    try:
        from routes.auth import mark_step_complete
        mark_step_complete(db, user.id, "set_visibility")
    except Exception:
        pass

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
    """User explicitly shares a buy/sell transaction, with optional note.

    Pulls the latest matching UserTransaction so we can snapshot the rich
    fields (broker_name, is_opening_position, shares/price, account_type)
    into FeedEvent.metadata_ for the redesigned TradeCard. Falls back to
    the legacy minimal payload if no UserTransaction is found.
    """
    from models import UserTransaction, InstrumentMap

    event_type = EventType.added_stock if data.transaction_type == "buy" else EventType.removed_stock

    # Most-recent matching transaction so the feed snapshot reflects what was actually shared.
    tx = (
        db.query(UserTransaction)
        .filter(
            UserTransaction.user_id == user.id,
            UserTransaction.contract_code == data.contract_code,
            UserTransaction.action == data.transaction_type,
        )
        .order_by(UserTransaction.transaction_date.desc().nullslast(), UserTransaction.id.desc())
        .first()
    )

    # Look up the EODHD ticker so the sparkline has a symbol to plot.
    mapping = (
        db.query(InstrumentMap).filter(InstrumentMap.ee_name == data.stock_name).first()
    )

    note_id = None
    if data.note:
        note = Note(
            user_id=user.id,
            body=data.note,
            visibility=Tier.public,
            stock_tag=data.contract_code,
            stock_name=data.stock_name,
            trade_linked=True,
        )
        db.add(note)
        db.flush()
        note_id = note.id

    # Allocation % at moment of share. We deliberately compute and store *only*
    # the percentage, never the rand amount, so leaks via the feed are impossible
    # (D-7: never show rand values, only %).
    holdings = db.query(Holding).filter(Holding.user_id == user.id).all()
    total_value = sum((h.current_value or 0) for h in holdings) or 0.0
    matching = next(
        (h for h in holdings if (h.contract_code == data.contract_code) or (h.stock_name == data.stock_name)),
        None,
    )
    allocation_pct = None
    if total_value > 0 and matching and matching.current_value:
        allocation_pct = round((matching.current_value / total_value) * 100, 2)

    metadata = {
        "stock_name": data.stock_name,
        "contract_code": data.contract_code,
        "ticker": mapping.ticker if mapping else None,
        "eodhd_symbol": mapping.eodhd_symbol if mapping else None,
        "market": mapping.market if mapping else None,
        "sector": mapping.sector if mapping else None,
        "allocation_pct": allocation_pct,
    }
    if tx:
        metadata.update({
            "broker_name": tx.broker_name,
            "account_type": tx.account_type,
            "is_opening_position": bool(tx.is_opening_position),
            "trade_date": str(tx.transaction_date)[:10] if tx.transaction_date else None,
            "user_transaction_id": tx.id,
            # NOTE: shares / price / amount intentionally NOT stored in feed metadata.
            # They live on UserTransaction (visible to owner only via /transactions).
        })

    feed_event = FeedEvent(
        user_id=user.id,
        event_type=event_type,
        visibility=Tier.public,
        note_id=note_id,
        metadata_=metadata,
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
    """Get all your transactions, sorted by date. Owner-only payload —
    includes price + amount so the user sees their own data."""
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
        "broker_name": t.broker_name,
        "is_opening_position": bool(t.is_opening_position),
        "display_mode": t.display_mode,  # null = use account default
        "quantity": t.quantity,
        "price": t.price,
        "amount": t.amount,
        "transaction_date": str(t.transaction_date)[:10] if t.transaction_date else None,
        "shared_count": t.shared_count,
        "created_at": str(t.created_at),
    } for t in txs]


class TransactionDisplayUpdate(BaseModel):
    mode: str  # "rand" | "usd" | "pct" | "auto"


@router.patch("/transactions/{tx_id}/display")
def update_transaction_display(
    tx_id: int,
    data: TransactionDisplayUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Owner-only: change how a single transaction renders on the
    Transactions page. mode='auto' clears the override."""
    from models import UserTransaction
    valid = {"rand", "usd", "pct", "auto"}
    if data.mode not in valid:
        raise HTTPException(status_code=400, detail=f"mode must be one of {valid}")
    tx = (
        db.query(UserTransaction)
        .filter(UserTransaction.id == tx_id, UserTransaction.user_id == user.id)
        .first()
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    tx.display_mode = None if data.mode == "auto" else data.mode
    db.commit()
    return {"id": tx.id, "display_mode": tx.display_mode}


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


@router.get("/user/{user_id}/holding-detail/{stock_name}")
def get_holding_detail(
    user_id: int,
    stock_name: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get trade details for a specific holding."""
    from models import UserTransaction
    from sqlalchemy import func
    txs = db.query(UserTransaction).filter(
        UserTransaction.user_id == user_id,
        UserTransaction.stock_name == stock_name,
    ).order_by(UserTransaction.transaction_date.asc()).all()
    if not txs:
        return {"trade_count": 0}
    dates = [t.transaction_date for t in txs if t.transaction_date]
    first = min(dates) if dates else None
    last = max(dates) if dates else None
    duration = (last - first).days if first and last else 0
    return {
        "trade_count": len(txs),
        "first_trade_date": str(first)[:10] if first else None,
        "last_trade_date": str(last)[:10] if last else None,
        "hold_duration_days": duration,
        "buy_count": sum(1 for t in txs if t.action == 'buy'),
        "sell_count": sum(1 for t in txs if t.action == 'sell'),
    }


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
