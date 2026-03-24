"""
EasyEquities file import — parse transaction history XLSX and statement PDFs.
"""

import re
import logging
from datetime import datetime, timezone
from io import BytesIO

from sqlalchemy.orm import Session

from models import User, Holding, AccountType

logger = logging.getLogger(__name__)


def parse_transaction_xlsx(file_bytes: bytes) -> dict:
    """
    Parse an EasyEquities Transaction History XLSX file.
    Returns aggregated holdings and raw transactions.
    """
    import openpyxl

    wb = openpyxl.load_workbook(BytesIO(file_bytes), read_only=True)
    ws = wb.active

    stocks = {}
    transactions = []

    for row in range(2, ws.max_row + 1):
        date_val = ws.cell(row, 1).value
        comment = str(ws.cell(row, 2).value or '')
        amount = ws.cell(row, 3).value or 0

        # Parse buy/sell transactions
        match = re.match(r'(Bought|Sold) (.+?) ([\d,.]+) @ ([\d,.]+)', comment)
        if match:
            action = match.group(1).lower()  # "bought" or "sold"
            stock_name = match.group(2).strip()
            quantity = float(match.group(3).replace(',', ''))
            price = float(match.group(4).replace(',', ''))

            # Aggregate into holdings
            if stock_name not in stocks:
                stocks[stock_name] = {
                    'stock_name': stock_name,
                    'total_qty': 0,
                    'total_spent': 0,
                    'buy_count': 0,
                    'sell_count': 0,
                    'first_buy': None,
                    'last_activity': None,
                }

            if action == 'bought':
                stocks[stock_name]['total_qty'] += quantity
                stocks[stock_name]['total_spent'] += abs(amount)
                stocks[stock_name]['buy_count'] += 1
            else:
                stocks[stock_name]['total_qty'] -= quantity
                stocks[stock_name]['sell_count'] += 1

            # Track dates
            if date_val:
                date_str = str(date_val)[:10]
                if not stocks[stock_name]['first_buy']:
                    stocks[stock_name]['first_buy'] = date_str
                stocks[stock_name]['last_activity'] = date_str

            transactions.append({
                'date': str(date_val)[:19] if date_val else None,
                'action': action,
                'stock_name': stock_name,
                'quantity': quantity,
                'price': price,
                'amount': abs(amount),
            })

    wb.close()

    # Build holdings list (only stocks with positive quantity)
    holdings = []
    for name, data in sorted(stocks.items()):
        if data['total_qty'] > 0:
            avg_price = data['total_spent'] / data['total_qty'] if data['total_qty'] > 0 else 0
            holdings.append({
                'stock_name': name,
                'quantity': round(data['total_qty'], 4),
                'avg_price': round(avg_price, 2),
                'total_invested': round(data['total_spent'], 2),
                'buy_count': data['buy_count'],
                'sell_count': data['sell_count'],
                'first_buy': data['first_buy'],
                'last_activity': data['last_activity'],
            })

    return {
        'holdings': holdings,
        'transactions': transactions,
        'total_stocks': len(holdings),
        'total_transactions': len(transactions),
    }


def parse_statement_pdf(file_bytes: bytes, password: str = None) -> dict:
    """
    Parse an EasyEquities monthly statement PDF.
    Extracts account info, holdings, and performance.
    """
    import subprocess
    import tempfile
    import os

    # Write to temp file for pdftotext
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
        f.write(file_bytes)
        temp_path = f.name

    try:
        cmd = ['pdftotext', '-layout']
        if password:
            cmd.extend(['-upw', password])
        cmd.extend([temp_path, '-'])

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if result.returncode != 0:
            return {'error': 'Failed to read PDF. Check password.', 'raw': result.stderr}

        text = result.stdout

        # Extract account info
        account_info = {}

        # Account number
        acc_match = re.search(r'(EE\d+-\d+)', text)
        if acc_match:
            account_info['account_number'] = acc_match.group(1)

        # Account type (TFSA, ZAR, USD)
        if 'TFSA' in text:
            account_info['account_type'] = 'TFSA'
        elif 'USD' in text:
            account_info['account_type'] = 'USD'
        else:
            account_info['account_type'] = 'ZAR'

        # Closing value
        close_match = re.search(r'Closing Value\s+([\d, ]+)', text)
        if close_match:
            account_info['closing_value'] = float(close_match.group(1).replace(' ', '').replace(',', ''))

        # Performance
        perf = {}
        for period in ['Last Month', 'Last 3 Months', 'Last 6 Months', 'Last 12 Months', 'Since Inception']:
            match = re.search(rf'{re.escape(period)}\s+([-\d.]+)%', text)
            if match:
                perf[period.lower().replace(' ', '_')] = float(match.group(1))
        account_info['performance'] = perf

        return {
            'account_info': account_info,
            'raw_text_preview': text[:500],
        }

    finally:
        os.unlink(temp_path)


def import_holdings_to_db(
    db: Session,
    user: User,
    parsed_data: dict,
    account_type: str = "ZAR",
) -> dict:
    """
    Import parsed holdings into the database for a user.
    Replaces existing holdings for the given account type.
    """
    holdings = parsed_data.get('holdings', [])

    if not holdings:
        return {'message': 'No holdings found in file', 'count': 0}

    # Map account type
    try:
        acc_type = AccountType(account_type)
    except ValueError:
        acc_type = AccountType.ZAR

    # Remove existing holdings for this account type
    db.query(Holding).filter(
        Holding.user_id == user.id,
        Holding.account_type == acc_type,
    ).delete()

    now = datetime.now(timezone.utc)

    # Create contract codes from stock names
    for h in holdings:
        # Generate a contract code from stock name
        code = re.sub(r'[^A-Z0-9]', '', h['stock_name'].upper())[:10]
        contract_code = f"EE_{code}"

        holding = Holding(
            user_id=user.id,
            account_type=acc_type,
            stock_name=h['stock_name'],
            contract_code=contract_code,
            purchase_value=h['total_invested'],
            current_value=h['total_invested'],  # Will be updated with market data later
            current_price=h['avg_price'],
            shares=h['quantity'],
            last_synced_at=now,
        )
        db.add(holding)

    db.commit()

    return {
        'message': f'Imported {len(holdings)} holdings',
        'count': len(holdings),
        'stocks': [h['stock_name'] for h in holdings],
    }
