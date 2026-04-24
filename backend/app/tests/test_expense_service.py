import pytest
from app.services.expense_service import ExpenseService

def test_rounded_share_equal():
    total = 100
    # Splitting $100 equally among 3 people
    raw = [33.333, 33.333, 33.333]
    result = ExpenseService._rounded_share(total, raw)
    
    # Expected: [33.33, 33.33, 33.34]
    assert len(result) == 3
    assert result[0] == 33.33
    assert result[1] == 33.33
    assert result[2] == 33.34
    assert sum(result) == 100.0

def test_rounded_share_complex():
    total = 10.0
    raw = [3.333, 3.333, 3.333]
    result = ExpenseService._rounded_share(total, raw)
    
    assert sum(result) == 10.0
    assert result == [3.33, 3.33, 3.34]
