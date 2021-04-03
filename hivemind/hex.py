# Adapted from -- http://www.redblobgames.com/grids/hexagons/
from typing import Any, Generator, Tuple


class Hex:
    """
    Represents a tile in a hexagonal grid.
    q and r represent the axial coordinates.
    The third cube coordinate s is calculated implicitly.
    """

    directions = (
        (+1, -1, 0),
        (+1, 0, -1),
        (0, +1, -1),
        (-1, +1, 0),
        (-1, 0, +1),
        (0, -1, +1),
    )

    def __init__(self, q: int = 0, r: int = 0, _: Any = None) -> None:
         self.q = q
        self.r = r
        self.s = -(q + r)
        self._coords = (self.q, self.r, self.s)

    def __eq__(self, other: object) -> bool:
        if isinstance(other, Hex):
            return self.q == other.q and self.r == other.r
        else:
            return self._coords == other

    def __lt__(self, other: "Hex") -> bool:
        return self.q < other.q if self.q != other.q else self.r < other.r

    def __getitem__(self, index: int) -> int:
        return self._coords[index]

    def __repr__(self) -> str:
        return f"Hex({self.q}, {self.r}, {self.s})"

    def __hash__(self) -> int:
        return hash(self._coords)

    def __add__(self, other: "Hex") -> "Hex":
        return Hex(self.q + other.q, self.r + other.r)

    def __len__(self) -> int:
        return len(self._coords)

    def __sub__(self, other: "Hex") -> "Hex":
        return Hex(self.q - other[0], self.r - other[1])

    def __neg__(self) -> "Hex":
        return Hex(-self.q, -self.r)

    def __mul__(self, scalar: int) -> "Hex":
        return Hex(self.q * scalar, self.r * scalar)

    def neighbours(self) -> Generator["Hex", None, None]:
        return (self + Hex(*direction) for direction in self.directions)

    def circle_iterator(self) -> Generator[Tuple["Hex", "Hex", "Hex"], None, None]:
        """ Yields 6 tuples of 3 neighbouring hexes """
        neighbours = list(self.neighbours())
        for i in range(6):
            yield neighbours[i], neighbours[(i + 1) % 6], neighbours[(i + 2) % 6]

    def adjacent(self, other: "Hex") -> bool:
        """ Returns whether two hexes share a common side """
        return other in self.neighbours()
