"""
Price alert CRUD + evaluation.

Evaluation runs as part of the daily scraper job (see scraper_job.py).
Alerts are idempotent — once triggered, last_triggered_at gates re-firing
until the price crosses back through the threshold.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import InstrumentMap, PriceAlert, User

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


class AlertCreate(BaseModel):
    stock_name: str
    contract_code: str | None = None
    eodhd_symbol: str | None = None
    direction: str  # "above" | "below"
    threshold_price: float
    currency: str = "ZAR"


@router.post("/")
def create_alert(
    data: AlertCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.direction not in ("above", "below"):
        raise HTTPException(status_code=400, detail="direction must be 'above' or 'below'")
    if data.threshold_price <= 0:
        raise HTTPException(status_code=400, detail="threshold_price must be positive")

    eodhd = data.eodhd_symbol
    if not eodhd:
        m = db.query(InstrumentMap).filter(InstrumentMap.ee_name == data.stock_name).first()
        eodhd = m.eodhd_symbol if m else None

    alert = PriceAlert(
        user_id=user.id,
        stock_name=data.stock_name,
        contract_code=data.contract_code,
        eodhd_symbol=eodhd,
        direction=data.direction,
        threshold_price=data.threshold_price,
        currency=data.currency,
        active=True,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return _alert_out(alert)


@router.get("/")
def list_alerts(
    active_only: bool = True,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(PriceAlert).filter(PriceAlert.user_id == user.id)
    if active_only:
        q = q.filter(PriceAlert.active == True)  # noqa: E712
    return [_alert_out(a) for a in q.order_by(PriceAlert.created_at.desc()).all()]


@router.delete("/{alert_id}")
def delete_alert(
    alert_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    a = db.query(PriceAlert).filter(PriceAlert.id == alert_id, PriceAlert.user_id == user.id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")
    db.delete(a)
    db.commit()
    return {"ok": True}


def _alert_out(a: PriceAlert) -> dict:
    return {
        "id": a.id,
        "stock_name": a.stock_name,
        "contract_code": a.contract_code,
        "eodhd_symbol": a.eodhd_symbol,
        "direction": a.direction,
        "threshold_price": a.threshold_price,
        "currency": a.currency,
        "active": a.active,
        "last_triggered_at": a.last_triggered_at.isoformat() if a.last_triggered_at else None,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


# ----- Evaluator (called from scraper_job) -----

def evaluate_alerts(db: Session) -> dict:
    """
    Walk active alerts, check current price against threshold, fire a
    Notification on first crossing (idempotent via last_triggered_at).
    Returns counts for the cron's log.
    """
    from price_resolver import resolve_price
    from routes.notifications import emit as emit_notif

    alerts = db.query(PriceAlert).filter(PriceAlert.active == True).all()  # noqa: E712
    fired = 0
    skipped = 0
    errors = 0

    for a in alerts:
        if not a.eodhd_symbol:
            skipped += 1
            continue
        try:
            res = resolve_price(db, a.stock_name)
            price = res.get("price") if res else None
            if price is None:
                skipped += 1
                continue
            crossed = (
                (a.direction == "above" and price >= a.threshold_price)
                or (a.direction == "below" and price <= a.threshold_price)
            )
            if not crossed:
                # Reset trigger window if price moved back to other side of threshold,
                # so the next crossing fires again.
                if a.last_triggered_at is not None:
                    a.last_triggered_at = None
                continue
            if a.last_triggered_at is not None:
                continue  # already triggered, waiting for reverse crossing

            a.last_triggered_at = datetime.now(timezone.utc)
            emit_notif(
                db,
                user_id=a.user_id,
                actor_user_id=None,
                kind="price_alert",
                target_kind="alert",
                target_id=a.id,
                metadata={
                    "stock_name": a.stock_name,
                    "direction": a.direction,
                    "threshold_price": a.threshold_price,
                    "current_price": price,
                    "currency": a.currency,
                },
            )
            fired += 1
        except Exception:
            errors += 1
            continue

    db.commit()
    return {"fired": fired, "skipped": skipped, "errors": errors, "total": len(alerts)}
