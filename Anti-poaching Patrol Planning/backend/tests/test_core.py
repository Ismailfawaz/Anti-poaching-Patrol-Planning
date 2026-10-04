import pytest
from backend.environment.forest import Forest
from backend.belief.belief_state import BeliefState
from backend.belief.bayesian_update import bayesian_update
from backend.belief.transition_model import markov_update

def test_belief_sum_to_one():
    forest = Forest(5, 5)
    bs = BeliefState(forest)
    assert abs(sum(bs.get_belief().values()) - 1.0) < 1e-5

def test_bayesian_positive_update():
    forest = Forest(3, 3)
    bs = BeliefState(forest)
    initial_belief = bs.get_belief()["1_1"]
    bayesian_update(bs, "1_1", "human_detected", True)
    new_belief = bs.get_belief()["1_1"]
    assert new_belief > initial_belief
    assert abs(sum(bs.get_belief().values()) - 1.0) < 1e-5

def test_bayesian_negative_update():
    forest = Forest(3, 3)
    bs = BeliefState(forest)
    initial_belief = bs.get_belief()["1_1"]
    bayesian_update(bs, "1_1", "no_activity", False)
    new_belief = bs.get_belief()["1_1"]
    assert new_belief < initial_belief
    assert abs(sum(bs.get_belief().values()) - 1.0) < 1e-5

def test_markov_preserves_probability():
    forest = Forest(3, 3)
    bs = BeliefState(forest)
    bayesian_update(bs, "1_1", "human_detected", True)
    markov_update(bs, forest)
    assert abs(sum(bs.get_belief().values()) - 1.0) < 1e-5
