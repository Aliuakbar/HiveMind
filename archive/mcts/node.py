from collections import defaultdict

import numpy as np


class MonteCarloTreeSearchNode:
    def __init__(self, state, parent=None):
        self.state = state
        self.parent = parent
        self.children = []
        self._number_of_visits = 0.0
        self._results = defaultdict(int)
        self._untried_actions = None

    @property
    def untried_actions(self):
        """ returns list of moves """
        if self._untried_actions is None:
            self._untried_actions = list(self.state.possible_actions)
        return self._untried_actions

    @property
    def q(self):
        wins = self._results[self.parent.state.current_team]
        loses = self._results[-1 * self.parent.state.current_team]
        return wins - loses

    @property
    def n(self):
        return self._number_of_visits

    def expand(self):
        """ Does add a child """
        action = self.untried_actions.pop()
        next_state = self.state + action
        child_node = MonteCarloTreeSearchNode(next_state, parent=self)
        self.children.append(child_node)
        return child_node

    def is_terminal_node(self):
        return self.state.is_game_over()

    def rollout(self):
        """ Playout a game until done """
        current_rollout_board = self.state
        # TODO
        while not current_rollout_board.is_game_over():
            if current_rollout_board.turn_number > 100:
                print("Too many moves, treat as stalemate")
                return 0
            possible_actions = current_rollout_board.possible_actions
            action = self.rollout_policy(possible_actions)
            current_rollout_board = current_rollout_board + action
        print(current_rollout_board.game_result)
        return current_rollout_board.game_result

    def backpropagate(self, result):
        """ Update q and n upwards the tree """
        self._number_of_visits += 1.0
        self._results[result] += 1.0
        if self.parent:
            self.parent.backpropagate(result)

    def is_fully_expanded(self):
        """ Every children move tried """
        return len(self.untried_actions) == 0

    def best_child(self, c_param=1.4):
        """ chooses the best possible node -> Move """
        choices_weights = [
            (c.q / c.n) + c_param * np.sqrt((2 * np.log(self.n) / c.n))
            for c in self.children
        ]
        return self.children[np.argmax(choices_weights)]

    def rollout_policy(self, possible_actions):
        """ How to choose from possible moves -> Move """
        return np.random.choice(possible_actions)
