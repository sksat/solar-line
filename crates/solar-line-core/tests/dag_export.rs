//! Export DAG graph algorithm results as JSON for cross-validation with networkx.
//!
//! Usage: cargo test --test dag_export -- --nocapture > cross_validation/dag_values.json

#[cfg(test)]
mod export {
    use solar_line_core::dag::{Dag, DagNode, NodeStatus, NodeType};

    fn make_test_graph() -> Dag {
        // Graph structure:
        //   0 → 1 → 3 → 5
        //   0 → 2 → 3
        //   1 → 4 → 5
        //   2 → 4
        //   6 (orphan, no edges)
        //
        // Edges (depends_on = upstream, "who do I depend on?"):
        //   node 0: depends on [] (root)
        //   node 1: depends on [0]
        //   node 2: depends on [0]
        //   node 3: depends on [1, 2]
        //   node 4: depends on [1, 2]
        //   node 5: depends on [3, 4]
        //   node 6: depends on [] (orphan)
        let nodes = vec![
            DagNode {
                id: 0,
                node_type: NodeType::DataSource,
                status: NodeStatus::Valid,
                depends_on: vec![],
                tags: vec![],
            },
            DagNode {
                id: 1,
                node_type: NodeType::Parameter,
                status: NodeStatus::Valid,
                depends_on: vec![0],
                tags: vec![],
            },
            DagNode {
                id: 2,
                node_type: NodeType::Parameter,
                status: NodeStatus::Valid,
                depends_on: vec![0],
                tags: vec![],
            },
            DagNode {
                id: 3,
                node_type: NodeType::Analysis,
                status: NodeStatus::Valid,
                depends_on: vec![1, 2],
                tags: vec![],
            },
            DagNode {
                id: 4,
                node_type: NodeType::Analysis,
                status: NodeStatus::Valid,
                depends_on: vec![1, 2],
                tags: vec![],
            },
            DagNode {
                id: 5,
                node_type: NodeType::Report,
                status: NodeStatus::Valid,
                depends_on: vec![3, 4],
                tags: vec![],
            },
            DagNode {
                id: 6,
                node_type: NodeType::Task,
                status: NodeStatus::Valid,
                depends_on: vec![],
                tags: vec![],
            },
        ];
        Dag::new(nodes)
    }

    #[test]
    fn export_dag_values() {
        let dag = make_test_graph();
        let mut results = String::from("{\n");

        // Graph structure
        results.push_str("  \"graph\": {\n");
        results.push_str(&format!("    \"node_count\": {},\n", dag.node_count()));
        results.push_str(&format!("    \"edge_count\": {},\n", dag.edge_count()));

        // Export edges as [from, to] pairs (from→to means "from" is upstream of "to")
        results.push_str("    \"edges\": [\n");
        let mut all_edges: Vec<(usize, usize)> = Vec::new();
        for i in 0..dag.node_count() {
            for &dep in dag.upstream(i) {
                all_edges.push((dep, i));
            }
        }
        for (idx, &(from, to)) in all_edges.iter().enumerate() {
            let comma = if idx < all_edges.len() - 1 { "," } else { "" };
            results.push_str(&format!("      [{}, {}]{}\n", from, to, comma));
        }
        results.push_str("    ]\n");
        results.push_str("  },\n");

        // Topological sort
        results.push_str("  \"topological_sort\": ");
        if let Some(order) = dag.topological_sort() {
            results.push_str(&format!("{:?},\n", order));
        } else {
            results.push_str("null,\n");
        }

        // Depths
        let depths = dag.compute_depths();
        results.push_str(&format!("  \"depths\": {:?},\n", depths));

        // Critical path
        let crit = dag.critical_path();
        results.push_str(&format!("  \"critical_path\": {:?},\n", crit));

        // All upstream for each node
        results.push_str("  \"all_upstream\": {\n");
        for i in 0..dag.node_count() {
            let mut up = dag.all_upstream(i);
            up.sort();
            let comma = if i < dag.node_count() - 1 { "," } else { "" };
            results.push_str(&format!("    \"{}\": {:?}{}\n", i, up, comma));
        }
        results.push_str("  },\n");

        // All downstream for each node
        results.push_str("  \"all_downstream\": {\n");
        for i in 0..dag.node_count() {
            let mut down = dag.all_downstream(i);
            down.sort();
            let comma = if i < dag.node_count() - 1 { "," } else { "" };
            results.push_str(&format!("    \"{}\": {:?}{}\n", i, down, comma));
        }
        results.push_str("  },\n");

        // Orphans
        let orphans = dag.orphans();
        results.push_str(&format!("  \"orphans\": {:?},\n", orphans));

        // Impact analysis for node 0 (root)
        let impact_0 = dag.impact_analysis(0);
        results.push_str("  \"impact_0\": {\n");
        results.push_str(&format!(
            "    \"cascade_count\": {},\n",
            impact_0.cascade_count
        ));
        let mut affected_0 = impact_0.affected_nodes.clone();
        affected_0.sort();
        results.push_str(&format!("    \"affected_nodes\": {:?}\n", affected_0));
        results.push_str("  },\n");

        // Impact analysis for node 1
        let impact_1 = dag.impact_analysis(1);
        results.push_str("  \"impact_1\": {\n");
        results.push_str(&format!(
            "    \"cascade_count\": {},\n",
            impact_1.cascade_count
        ));
        let mut affected_1 = impact_1.affected_nodes.clone();
        affected_1.sort();
        results.push_str(&format!("    \"affected_nodes\": {:?}\n", affected_1));
        results.push_str("  },\n");

        // Find paths from 0 to 5
        let paths_0_5 = dag.find_paths(0, 5, 10);
        results.push_str("  \"paths_0_to_5\": [\n");
        for (i, path) in paths_0_5.iter().enumerate() {
            let comma = if i < paths_0_5.len() - 1 { "," } else { "" };
            results.push_str(&format!("    {:?}{}\n", path, comma));
        }
        results.push_str("  ],\n");

        // Cycle detection (should be None for this DAG)
        let cycle = dag.detect_cycle();
        results.push_str(&format!("  \"has_cycle\": {}\n", cycle.is_some()));

        results.push_str("}\n");
        println!("{}", results);
    }
}
