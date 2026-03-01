#!/usr/bin/env python3
"""
Cross-validation of solar-line-core DAG graph algorithms against networkx.

Builds the same graph in both Rust (via JSON export) and Python (networkx),
then compares topological sort, reachability, depths, critical paths, etc.

Usage: python3 cross_validation/validate_dag.py
"""

import json
import sys
from pathlib import Path

import networkx as nx


def main():
    json_path = Path(__file__).parent / "dag_values.json"
    with open(json_path) as f:
        rust = json.load(f)

    passed = 0
    failed = 0
    details = []

    def check(name, rust_val, python_val):
        nonlocal passed, failed
        ok = rust_val == python_val
        status = "PASS" if ok else "FAIL"
        if ok:
            passed += 1
        else:
            failed += 1
            print(f"  [FAIL] {name}: Rust={rust_val}, Python={python_val}", file=sys.stderr)
        details.append(f"  [{status}] {name}: Rust={rust_val}, Python={python_val}")

    # Build the same graph in networkx
    G = nx.DiGraph()
    n = rust["graph"]["node_count"]
    for i in range(n):
        G.add_node(i)
    for edge in rust["graph"]["edges"]:
        G.add_edge(edge[0], edge[1])  # from → to

    # --- Basic graph properties ---
    print("=== Validating graph structure ===")
    check("node_count", rust["graph"]["node_count"], G.number_of_nodes())
    check("edge_count", rust["graph"]["edge_count"], G.number_of_edges())

    # --- Topological sort ---
    print("=== Validating topological sort ===")
    rust_topo = rust["topological_sort"]
    # Rust's topological sort may differ from networkx's, but both must be valid
    # Verify Rust ordering is valid: for every edge (u, v), u appears before v
    topo_valid = True
    if rust_topo is not None:
        pos = {node: idx for idx, node in enumerate(rust_topo)}
        for u, v in G.edges():
            if pos[u] >= pos[v]:
                topo_valid = False
                break
    check("topo_sort_valid", True, topo_valid)
    check("topo_sort_length", len(rust_topo) if rust_topo else 0, n)

    # networkx topological sort must also be valid
    nx_topo = list(nx.topological_sort(G))
    check("nx_topo_sort_length", n, len(nx_topo))

    # --- Depths (longest path from root) ---
    print("=== Validating node depths ===")
    # In networkx: depth = longest path from any root (in-degree 0) to each node
    nx_depths = [0] * n
    for node in nx.topological_sort(G):
        for succ in G.successors(node):
            if nx_depths[succ] < nx_depths[node] + 1:
                nx_depths[succ] = nx_depths[node] + 1

    for i in range(n):
        check(f"depth[{i}]", rust["depths"][i], nx_depths[i])

    # --- Critical path (longest path) ---
    print("=== Validating critical path ===")
    rust_crit = rust["critical_path"]
    # networkx: find longest path in DAG
    nx_longest = nx.dag_longest_path(G)
    check("critical_path_length", len(rust_crit), len(nx_longest))
    # Both paths should have the same length (= max_depth + 1)
    max_depth = max(nx_depths)
    check("critical_path_depth", len(rust_crit) - 1, max_depth)

    # Verify Rust's critical path is actually a valid path
    crit_valid = True
    for i in range(len(rust_crit) - 1):
        if not G.has_edge(rust_crit[i], rust_crit[i + 1]):
            crit_valid = False
            break
    check("critical_path_valid", True, crit_valid)

    # --- All upstream (transitive predecessors) ---
    print("=== Validating all_upstream ===")
    for i in range(n):
        rust_up = sorted(rust["all_upstream"][str(i)])
        nx_up = sorted(nx.ancestors(G, i))
        check(f"all_upstream[{i}]", rust_up, nx_up)

    # --- All downstream (transitive successors) ---
    print("=== Validating all_downstream ===")
    for i in range(n):
        rust_down = sorted(rust["all_downstream"][str(i)])
        nx_down = sorted(nx.descendants(G, i))
        check(f"all_downstream[{i}]", rust_down, nx_down)

    # --- Orphans ---
    print("=== Validating orphans ===")
    nx_orphans = sorted([
        node for node in G.nodes()
        if G.in_degree(node) == 0 and G.out_degree(node) == 0
    ])
    check("orphans", sorted(rust["orphans"]), nx_orphans)

    # --- Impact analysis (= all_downstream for a given node) ---
    print("=== Validating impact analysis ===")
    nx_impact_0 = sorted(nx.descendants(G, 0))
    check("impact_0_cascade", rust["impact_0"]["cascade_count"], len(nx_impact_0))
    check("impact_0_affected", sorted(rust["impact_0"]["affected_nodes"]), nx_impact_0)

    nx_impact_1 = sorted(nx.descendants(G, 1))
    check("impact_1_cascade", rust["impact_1"]["cascade_count"], len(nx_impact_1))
    check("impact_1_affected", sorted(rust["impact_1"]["affected_nodes"]), nx_impact_1)

    # --- Find paths ---
    print("=== Validating find_paths ===")
    rust_paths = rust["paths_0_to_5"]
    # networkx: all simple paths from 0 to 5
    nx_paths = sorted(nx.all_simple_paths(G, 0, 5), key=len)
    check("paths_0_5_count", len(rust_paths), len(nx_paths))
    # Compare sorted path sets
    rust_paths_sorted = sorted([tuple(p) for p in rust_paths])
    nx_paths_sorted = sorted([tuple(p) for p in nx_paths])
    check("paths_0_5_content", rust_paths_sorted, nx_paths_sorted)

    # --- Cycle detection ---
    print("=== Validating cycle detection ===")
    check("has_cycle", rust["has_cycle"], not nx.is_directed_acyclic_graph(G))

    # Summary
    print()
    print("=" * 70)
    print(f"DAG cross-validation results: {passed} passed, {failed} failed")
    print("=" * 70)
    for d in details:
        print(d)
    print()
    if failed == 0:
        print("All checks PASSED.")
    else:
        print(f"WARNING: {failed} check(s) FAILED!")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
