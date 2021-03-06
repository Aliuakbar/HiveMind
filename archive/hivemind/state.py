import json
import logging
import random
from copy import deepcopy
from dataclasses import dataclass
from functools import cached_property
from typing import Any, Callable, Dict, List, Optional, Set, Tuple, Union

from .hex import Hex
from .hive import Hive
from .insect import Insect, Stone, Team

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Action:
    """ Base class for abstract game action that can be performed in a turn """

    def __eq__(self, other: Any) -> bool:
        return self.__dict__.items() == other.__dict__.items()


@dataclass(eq=False)
class Move(Action):
    """ Move from a origin Hex to a destination Hex """

    origin: Hex
    destination: Hex


@dataclass(eq=False)
class Drop(Action):
    """ Drop a stone to a destination Hex """

    stone: Stone
    destination: Hex


class Pass(Action):
    """ When no action is possible you have to pass """


class State:
    """
    State contains all information to completely describe each state of the game
    and some helper functions/attributes to optimize the processing.
    Necessary information is:
    - hive: Dict[Hex: List[Stone]]
    - turn_number: int
    Derivable from the atomic information
    - move_allowed
    - availables

    Only valid states are representable.
    Root is the only starting point and every state is an ancestor of it.
    Any child is yielded from the application of a valid action on the parent state.
    """

    def __init__(self, hive: Optional[Hive] = None, turn_number: int = 0) -> None:
        self.hive = hive if hive is not None else Hive()
        self._bee_move = [False, False]
        self.turn_number = turn_number
        insects = (
            Insect.BEE,
            Insect.SPIDER,
            Insect.SPIDER,
            Insect.ANT,
            Insect.ANT,
            Insect.ANT,
            Insect.GRASSHOPPER,
            Insect.GRASSHOPPER,
            Insect.GRASSHOPPER,
            Insect.BEETLE,
            Insect.BEETLE,
        )
        self.availables = [
            Stone(insect, team) for insect in insects for team in list(Team)
        ]

    def __repr__(self) -> str:
        return f"State({self.hive}, {self.turn_number})"

    def to_json(self) -> str:
        # TODO
        dump: Dict[str, Any] = {}
        dump["hive"] = []
        for hex, stack in self.hive.items():
            for height, stone in enumerate(stack):
                dump["hive"].append({})
                temp = dump["hive"][-1]
                # r, s, h, name, team
                temp["q"] = hex.q
                temp["r"] = hex.r
                temp["height"] = height
                temp["name"] = stone.insect.value
                temp["team"] = stone.team.value
        dump["availables"] = []
        for stone in self.availables:
            dump["availables"].append({})
            temp = dump["availables"][-1]
            temp["name"] = stone.insect.value
            temp["team"] = stone.team.value

        # TODO: add more information
        return json.dumps(dump)

    @property
    def current_team(self) -> Team:
        return Team.WHITE if self.turn_number % 2 else Team.BLACK

    @property
    def move_allowed(self) -> bool:
        return self._bee_move[self.current_team.value]

    def __add__(self, action: Action) -> "State":
        """ Returns a new State with the action performed """
        assert action in self.possible_actions
        new_state = deepcopy(self)
        new_hive = new_state.hive
        if isinstance(action, Move):
            # Remove the stone from the old position and add it at the new one
            stone = new_hive.at(action.origin)
            new_hive.remove_stone(action.origin)
            new_hive.add_stone(action.destination, stone)
        elif isinstance(action, Drop):
            stone = action.stone
            if stone.insect == Insect.BEE:
                # Update that the bee is dropped
                new_state._bee_move[self.current_team.value] = True
            # Remove the dropped stone from the availables and add it to the hive
            new_state.availables.remove(stone)
            new_hive.add_stone(action.destination, stone)
        new_state.turn_number += 1
        # Unset them so they are recomputed on the new state
        if hasattr(new_state, "possible_actions"):
            del new_state.__dict__["possible_actions"]
        logger.debug(f"Created new state {new_state}")
        return new_state

    @property
    def game_result(self) -> Union[None, int]:
        return self.hive.game_result

    def is_game_over(self) -> bool:
        """ Check if the game is over """
        return not (self.game_result is None)

    def _unique_availables(self) -> Set[Stone]:
        """ Returns the unique availables Stones that can be dropped by the current team """
        return {a for a in self.availables if a.team == self.current_team}

    @cached_property
    def possible_actions(self) -> Tuple[Action, ...]:
        """ Generate all legal actions for the current state """
        opts: List[Action] = []
        drop_stones = self._unique_availables()
        if self.turn_number == 0:
            return tuple(Drop(stone, Hex(0, 0)) for stone in drop_stones)
        elif self.turn_number == 1:
            return tuple(Drop(stone, Hex(0, -1)) for stone in drop_stones)
        elif self.turn_number >= 6 and not self.move_allowed:
            for drop_hex in self.hive.generate_drops(self.current_team):
                opts.append(Drop(Stone(Insect.BEE, self.current_team), drop_hex))
        else:
            if drop_stones:
                for drop_hex in self.hive.generate_drops(self.current_team):
                    opts.extend(Drop(stone, drop_hex) for stone in drop_stones)
            if self.move_allowed:
                for origin, destination in self.hive.generate_moves(self.current_team):
                    opts.append(Move(origin, destination))
        return tuple(opts) if opts else (Pass(),)

    def children(self) -> Tuple["State", ...]:
        """ Returns a tuple of all possible child states """
        return tuple(self + action for action in self.possible_actions)

    def next_state(
        self, policy: Callable[[Tuple[Action, ...]], Action] = random.choice
    ) -> "State":
        """ Takes a policy function that has to select an action out of the tuple ot possibles """
        return self + policy(self.possible_actions)
