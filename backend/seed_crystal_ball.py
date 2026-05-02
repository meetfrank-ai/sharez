#!/usr/bin/env python
"""
Seed the inaugural Crystal Ball Challenge.

Run once after Phase Crystal-Ball deploys:
    cd backend && python seed_crystal_ball.py

Idempotent — re-running won't duplicate the challenge or invites already
present. Mints 400 invite codes on first run (intended distribution: 100
beta users × 4 codes each). Sharez allocates the remaining 100 directly
by creating ChallengeParticipant rows manually for invited users without
an invite code requirement (or by adding more invite codes via the
/api/challenges/admin/{slug}/invites endpoint).
"""

import logging
import secrets
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from dotenv import load_dotenv
load_dotenv(_BACKEND / ".env")

from database import SessionLocal
from models import Challenge, ChallengeInvite

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")
logger = logging.getLogger(__name__)


CHALLENGE = {
    "name": "Crystal Ball — Year 1",
    "slug": "crystal-ball",
    "description": (
        "500 invited investors. 5 JSE picks. Locked theses. Year-long contest. "
        "Anyone can watch the leaderboard, read the picks, and follow the storylines."
    ),
    "pick_count": 5,
    "max_participants": 500,
    "market": "JSE",
    # Default lockup: one week from seed time. Adjust as needed.
    "lockup_offset_days": 7,
    "duration_days": 365,
}

INVITE_BATCH_SIZE = 400  # 100 beta users × 4


def main():
    db = SessionLocal()
    try:
        existing = db.query(Challenge).filter(Challenge.slug == CHALLENGE["slug"]).first()
        if existing:
            logger.info(f"Challenge '{CHALLENGE['slug']}' already exists (id={existing.id}).")
            c = existing
        else:
            now = datetime.now(timezone.utc)
            c = Challenge(
                name=CHALLENGE["name"],
                slug=CHALLENGE["slug"],
                description=CHALLENGE["description"],
                pick_count=CHALLENGE["pick_count"],
                max_participants=CHALLENGE["max_participants"],
                market=CHALLENGE["market"],
                lockup_at=now + timedelta(days=CHALLENGE["lockup_offset_days"]),
                end_at=now + timedelta(days=CHALLENGE["duration_days"]),
                is_public_view=True,
                is_active=True,
            )
            db.add(c)
            db.commit()
            db.refresh(c)
            logger.info(f"Created Challenge id={c.id} slug={c.slug} lockup={c.lockup_at}")

        # Mint invite codes if there are fewer than the batch size
        existing_count = db.query(ChallengeInvite).filter(ChallengeInvite.challenge_id == c.id).count()
        to_mint = max(0, INVITE_BATCH_SIZE - existing_count)
        if to_mint == 0:
            logger.info(f"Already have {existing_count} invites — skipping mint.")
        else:
            for _ in range(to_mint):
                db.add(ChallengeInvite(
                    challenge_id=c.id,
                    code=secrets.token_urlsafe(8),
                ))
            db.commit()
            logger.info(f"Minted {to_mint} invite codes (total now {existing_count + to_mint}).")

        # Print the unused codes for distribution
        unused = (
            db.query(ChallengeInvite)
            .filter(ChallengeInvite.challenge_id == c.id, ChallengeInvite.used_by_user_id.is_(None))
            .all()
        )
        logger.info(f"Unused invite codes: {len(unused)}")
        if "--print-codes" in sys.argv:
            for inv in unused[:50]:
                print(inv.code)
    finally:
        db.close()


if __name__ == "__main__":
    main()
