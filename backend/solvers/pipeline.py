"""Part 5: Chain tour time into craft time and total the score."""


def run_pipeline(scenario, route="optimal"):
    """route: "optimal" (Hungarian + branching tour) or "nearest_neighbour" (naive baseline).

    craft_time = scenario["total_time"] - tour_time. Return an envelope.
    optimal            -> status "optimal", answer tour_time 70, craft_time 50, combat 445, crafting 117, total 562.
    nearest_neighbour  -> status "infeasible", tour_time 80, craft_time 40, combat 445, crafting None, total None
                          and a message (combat does not depend on the route).
    Both answers also carry route_policy and tour (list of labels). See fixtures/pipeline*.json.
    The time matrix comes from solvers.geometry.time_matrix(scenario["nodes"], labels).
    """
    raise NotImplementedError("Part 5")
