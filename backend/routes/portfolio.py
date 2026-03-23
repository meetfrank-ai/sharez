from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User, Holding, Tier, InvestmentReason
from schemas import HoldingOut, EECredentials, TierConfigUpdate, TierConfigOut, InvestmentReasonCreate, InvestmentReasonOut
from auth import get_current_user
from ee_sync import store_ee_credentials, sync_portfolio
from tier_access import get_access_tier, can_view

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
    return db.query(Holding).filter(Holding.user_id == user.id).all()


@router.get("/user/{user_id}", response_model=list[HoldingOut])
def get_user_holdings(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    access = get_access_tier(db, current_user.id, user_id)
    config = target.tier_config

    holdings = db.query(Holding).filter(Holding.user_id == user_id).all()

    if not config:
        # No config — only show public (stock names if enabled)
        return []

    # Determine what to show based on tier access
    if access == Tier.vault:
        shows = config.vault_shows or []
    elif access == Tier.inner_circle:
        shows = config.inner_circle_shows or []
    else:
        shows = config.public_shows or []

    # Check if stock names are visible at this tier
    show_stocks = "stock_names" in shows or "amounts" in shows
    show_allocation = "allocation_pct" in shows
    show_amounts = "amounts" in shows

    if not show_stocks and "sectors" not in shows:
        return []

    total_value = sum(h.current_value or 0 for h in holdings)
    result = []

    for h in holdings:
        out = HoldingOut.model_validate(h)

        if not show_amounts:
            out.purchase_value = None
            out.current_price = None
            out.shares = None
            if show_allocation and total_value > 0 and h.current_value:
                out.current_value = round((h.current_value / total_value) * 100, 2)
            elif not show_allocation:
                out.current_value = None

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


@router.post("/investment-reason", response_model=InvestmentReasonOut, status_code=201)
def save_investment_reason(
    data: InvestmentReasonCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save why a user invested in a stock."""
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


@router.post("/attach-note/{event_id}")
def attach_note_to_transaction(
    event_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get transaction details so frontend can open composer pre-tagged."""
    from models import FeedEvent
    event = db.query(FeedEvent).filter(FeedEvent.id == event_id, FeedEvent.user_id == user.id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {
        "event_id": event.id,
        "stock_name": event.metadata_.get("stock_name") if event.metadata_ else None,
        "contract_code": event.metadata_.get("contract_code") if event.metadata_ else None,
        "event_type": event.event_type.value,
    }
