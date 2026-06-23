"""Split a list of rows into slide-sized pages."""
from typing import TypeVar

T = TypeVar("T")


def chunk(items: list[T], size: int) -> list[list[T]]:
    size = max(1, int(size))
    return [items[i : i + size] for i in range(0, len(items), size)]
