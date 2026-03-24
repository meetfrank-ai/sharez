"""
EasyEquities file import — parse transaction history XLSX,
store raw transactions, and derive holdings.
"""

import re
import hashlib
import logging
from datetime import datetime, timezone
from io import BytesIO

from sqlalchemy.orm import Session

from models import User, Holding, UserTransaction, AccountType

logger = logging.getLogger(__name__)


def parse_transaction_xlsx(file_bytes: bytes) -> dict:
    """Parse an EasyEquities Transaction History XLSX file."""
    import openpyxl

    wb = openpyxl.load_workbook(BytesIO(file_bytes), read_only=True)
    ws = wb.active

    transactions = []

    for row in range(2, ws.max_row + 1):
        date_val = ws.cell(row, 1).value
        comment = str(ws.cell(row, 2).value or '')
        amount = ws.cell(row, 3).value or 0

        match = re.match(r'(Bought|Sold) (.+?) ([\d,.]+) @ ([\d,.]+)', comment)
        if match:
            action = 'buy' if match.group(1) == 'Bought' else 'sell'
            stock_name = match.group(2).strip()
            quantity = float(match.group(3).replace(',', ''))
            price = float(match.group(4).replace(',', ''))

            # Create dedup hash from date + stock + action + quantity + price
            hash_input = f"{date_val}{stock_name}{action}{quantity}{price}"
            import_hash = hashlib.md5(hash_input.encode()).hexdigest()

            transactions.append({
                'date': str(date_val)[:19] if date_val else None,
                'action': action,
                'stock_name': stock_name,
                'quantity': quantity,
                'price': price,
                'amount': abs(amount),
                'import_hash': import_hash,
            })

    wb.close()

    # Aggregate for preview
    stocks = {}
    for t in transactions:
        name = t['stock_name']
        if name not in stocks:
            stocks[name] = {'stock_name': name, 'total_qty': 0, 'total_spent': 0, 'buy_count': 0, 'sell_count': 0}
        if t['action'] == 'buy':
            stocks[name]['total_qty'] += t['quantity']
            stocks[name]['total_spent'] += t['amount']
            stocks[name]['buy_count'] += 1
        else:
            stocks[name]['total_qty'] -= t['quantity']
            stocks[name]['sell_count'] += 1

    holdings = [
        {
            'stock_name': name,
            'quantity': round(data['total_qty'], 4),
            'total_invested': round(data['total_spent'], 2),
            'buy_count': data['buy_count'],
            'sell_count': data['sell_count'],
        }
        for name, data in sorted(stocks.items()) if data['total_qty'] > 0
    ]

    return {
        'transactions': transactions,
        'holdings': holdings,
        'total_stocks': len(holdings),
        'total_transactions': len(transactions),
    }


def import_transactions_to_db(
    db: Session,
    user: User,
    parsed_data: dict,
    account_type: str = "ZAR",
) -> dict:
    """Store raw transactions and rebuild holdings from them."""
    transactions = parsed_data.get('transactions', [])
    if not transactions:
        return {'message': 'No transactions found', 'count': 0, 'new_count': 0}

    new_count = 0
    for t in transactions:
        # Check dedup — skip if already imported
        existing = db.query(UserTransaction).filter(
            UserTransaction.user_id == user.id,
            UserTransaction.import_hash == t['import_hash'],
        ).first()
        if existing:
            continue

        # Generate contract code
        code = re.sub(r'[^A-Z0-9]', '', t['stock_name'].upper())[:10]
        contract_code = f"EE_{code}"

        # Parse date
        tx_date = None
        if t['date']:
            try:
                tx_date = datetime.strptime(t['date'][:19], "%Y-%m-%d %H:%M:%S")
            except ValueError:
                try:
                    tx_date = datetime.strptime(t['date'][:10], "%Y-%m-%d")
                except ValueError:
                    pass

        db.add(UserTransaction(
            user_id=user.id,
            action=t['action'],
            stock_name=t['stock_name'],
            contract_code=contract_code,
            account_type=account_type,
            quantity=t['quantity'],
            price=t['price'],
            amount=t['amount'],
            transaction_date=tx_date,
            import_hash=t['import_hash'],
        ))
        new_count += 1

    db.flush()

    # Rebuild holdings from all transactions for this account type
    _rebuild_holdings(db, user, account_type)

    db.commit()

    stocks = list(set(t['stock_name'] for t in transactions))
    return {
        'message': f'Imported {new_count} new transactions',
        'count': len(stocks),
        'new_count': new_count,
        'total_transactions': len(transactions),
        'stocks': sorted(stocks),
    }


def _rebuild_holdings(db: Session, user: User, account_type: str):
    """Derive holdings from all user transactions for an account type."""
    # Get all transactions for this account
    all_txs = (
        db.query(UserTransaction)
        .filter(UserTransaction.user_id == user.id, UserTransaction.account_type == account_type)
        .order_by(UserTransaction.transaction_date.asc())
        .all()
    )

    # Aggregate per stock
    stocks = {}
    for tx in all_txs:
        name = tx.stock_name
        if name not in stocks:
            stocks[name] = {
                'stock_name': name,
                'contract_code': tx.contract_code,
                'shares': 0,
                'total_cost': 0,
            }
        if tx.action == 'buy':
            stocks[name]['shares'] += tx.quantity
            stocks[name]['total_cost'] += (tx.amount or 0)
        else:
            stocks[name]['shares'] -= tx.quantity

    # Map account type
    try:
        acc_type = AccountType(account_type)
    except ValueError:
        acc_type = AccountType.ZAR

    # Clear existing holdings for this account type and rebuild
    db.query(Holding).filter(
        Holding.user_id == user.id,
        Holding.account_type == acc_type,
    ).delete()

    now = datetime.now(timezone.utc)

    for name, data in stocks.items():
        if data['shares'] <= 0:
            continue  # Fully sold, don't create holding

        avg_price = data['total_cost'] / data['shares'] if data['shares'] > 0 else 0

        db.add(Holding(
            user_id=user.id,
            account_type=acc_type,
            stock_name=name,
            contract_code=data['contract_code'],
            purchase_value=data['total_cost'],
            current_value=data['total_cost'],  # Updated by EODHD price refresh
            current_price=avg_price,
            shares=data['shares'],
            last_synced_at=now,
        ))
