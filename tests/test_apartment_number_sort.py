from app.lib.apartment_number_sort import apartment_number_sort_key


def test_apartment_number_sort_key_orders_numeric_values() -> None:
    numbers = ["10", "2", "1", "20", "3"]
    assert sorted(numbers, key=apartment_number_sort_key) == ["1", "2", "3", "10", "20"]
