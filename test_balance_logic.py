from decimal import Decimal
from datetime import date
from enum import Enum

class TransactionType(str, Enum):
    PAYMENT = "payment"
    WITHDRAW = "withdraw"
    DEPOSIT = "deposit"
    INTEREST = "interest"
    TRANSFER = "transfer"

class Transaction:
    def __init__(self, type, amount, date):
        self.type = type
        self.amount = amount
        self.date = date

def calculate_balance(initial_balance, balance_date, target_date, transactions):
    balance = initial_balance
    
    if target_date >= balance_date:
        # Forward
        relevant_txns = [t for t in transactions if t.date > balance_date and t.date <= target_date]
        for txn in relevant_txns:
            if txn.type in [TransactionType.DEPOSIT, TransactionType.INTEREST]:
                balance += txn.amount
            else:
                balance -= txn.amount
    else:
        # Backward
        relevant_txns = [t for t in transactions if t.date > target_date and t.date <= balance_date]
        for txn in relevant_txns:
            if txn.type in [TransactionType.DEPOSIT, TransactionType.INTEREST]:
                balance -= txn.amount
            else:
                balance += txn.amount
                
    return balance

# Test Case 1: Forward
# Initial: 100 on Jan 1.
# Deposit 50 on Jan 2.
# Target: Jan 3.
# Expected: 150.
txns = [Transaction(TransactionType.DEPOSIT, Decimal(50), date(2023, 1, 2))]
res = calculate_balance(Decimal(100), date(2023, 1, 1), date(2023, 1, 3), txns)
print(f"Forward Deposit: {res} (Expected 150)")

# Test Case 2: Forward Payment
# Initial: 100 on Jan 1.
# Payment 30 on Jan 2.
# Target: Jan 3.
# Expected: 70.
txns = [Transaction(TransactionType.PAYMENT, Decimal(30), date(2023, 1, 2))]
res = calculate_balance(Decimal(100), date(2023, 1, 1), date(2023, 1, 3), txns)
print(f"Forward Payment: {res} (Expected 70)")

# Test Case 3: Backward Deposit
# Initial: 150 on Jan 3.
# Deposit 50 on Jan 2.
# Target: Jan 1.
# Expected: 100.
txns = [Transaction(TransactionType.DEPOSIT, Decimal(50), date(2023, 1, 2))]
res = calculate_balance(Decimal(150), date(2023, 1, 3), date(2023, 1, 1), txns)
print(f"Backward Deposit: {res} (Expected 100)")

# Test Case 4: Backward Payment
# Initial: 70 on Jan 3.
# Payment 30 on Jan 2.
# Target: Jan 1.
# Expected: 100.
txns = [Transaction(TransactionType.PAYMENT, Decimal(30), date(2023, 1, 2))]
res = calculate_balance(Decimal(70), date(2023, 1, 3), date(2023, 1, 1), txns)
print(f"Backward Payment: {res} (Expected 100)")
