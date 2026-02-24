//! DAG (Directed Acyclic Graph) analysis for dependency tracking.
//!
//! Mirrors the TypeScript DAG model (`dag-types.ts`) and provides
//! graph analysis algorithms that can be compiled to WASM for
//! browser-side interactive analysis.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/// Node type within the DAG.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NodeType {
    DataSource,
    Parameter,
    Analysis,
    Report,
    Task,
}

impl NodeType {
    pub fn as_str(&self) -> &'static str {
        match self {
            NodeType::DataSource => "data_source",
            NodeType::Parameter => "parameter",
            NodeType::Analysis => "analysis",
            NodeType::Report => "report",
            NodeType::Task => "task",
        }
    }

    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "data_source" => Some(NodeType::DataSource),
            "parameter" => Some(NodeType::Parameter),
            "analysis" => Some(NodeType::Analysis),
            "report" => Some(NodeType::Report),
            "task" => Some(NodeType::Task),
            _ => None,
        }
    }

    /// Layer priority for Sugiyama-style layout (lower = further left/top).
    pub fn layer_order(&self) -> usize {
        match self {
            NodeType::DataSource => 0,
            NodeType::Parameter => 1,
            NodeType::Analysis => 2,
            NodeType::Report => 3,
            NodeType::Task => 4,
        }
    }
}

/// Node status.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NodeStatus {
    Valid,
    Stale,
    Pending,
}

impl NodeStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            NodeStatus::Valid => "valid",
            NodeStatus::Stale => "stale",
            NodeStatus::Pending => "pending",
        }
    }

    pub fn parse(s: &str) -> Option<Self> {
        match s {
            "valid" => Some(NodeStatus::Valid),
            "stale" => Some(NodeStatus::Stale),
            "pending" => Some(NodeStatus::Pending),
            _ => None,
        }
    }
}

/// A single node in the DAG.
#[derive(Debug, Clone)]
pub struct DagNode {
    pub id: usize,
    pub node_type: NodeType,
    pub status: NodeStatus,
    /// Indices into Dag::nodes of upstream dependencies.
    pub depends_on: Vec<usize>,
    /// Tags for filtering (e.g. "episode:01", "source").
    pub tags: Vec<String>,
}

/// Complete DAG state: nodes + reverse index.
pub struct Dag {
    pub nodes: Vec<DagNode>,
    /// Forward adjacency: node → list of nodes that depend on it (downstream).
    forward: Vec<Vec<usize>>,
}

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq)]
pub enum DagError {
    CycleDetected(Vec<usize>),
    NodeNotFound(usize),
    DuplicateEdge { from: usize, to: usize },
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

impl Dag {
    /// Build a DAG from a set of nodes. Nodes must be indexed 0..n-1.
    /// Automatically builds the forward (reverse-edge) index.
    pub fn new(nodes: Vec<DagNode>) -> Self {
        let n = nodes.len();
        let mut forward = vec![Vec::new(); n];
        for node in &nodes {
            for &dep in &node.depends_on {
                if dep < n {
                    forward[dep].push(node.id);
                }
            }
        }
        Dag { nodes, forward }
    }

    pub fn node_count(&self) -> usize {
        self.nodes.len()
    }

    pub fn edge_count(&self) -> usize {
        self.nodes.iter().map(|n| n.depends_on.len()).sum()
    }

    // -----------------------------------------------------------------------
    // Basic queries
    // -----------------------------------------------------------------------

    /// Get direct upstream dependencies of a node.
    pub fn upstream(&self, node: usize) -> &[usize] {
        &self.nodes[node].depends_on
    }

    /// Get direct downstream dependents of a node.
    pub fn downstream(&self, node: usize) -> &[usize] {
        &self.forward[node]
    }

    /// Get all transitive upstream nodes (BFS).
    pub fn all_upstream(&self, node: usize) -> Vec<usize> {
        let mut visited = vec![false; self.nodes.len()];
        let mut queue = Vec::new();
        let mut result = Vec::new();
        for &dep in &self.nodes[node].depends_on {
            if !visited[dep] {
                visited[dep] = true;
                queue.push(dep);
            }
        }
        while let Some(current) = queue.pop() {
            result.push(current);
            for &dep in &self.nodes[current].depends_on {
                if !visited[dep] {
                    visited[dep] = true;
                    queue.push(dep);
                }
            }
        }
        result
    }

    /// Get all transitive downstream nodes (BFS). This is the invalidation cascade.
    pub fn all_downstream(&self, node: usize) -> Vec<usize> {
        let mut visited = vec![false; self.nodes.len()];
        let mut queue = Vec::new();
        let mut result = Vec::new();
        for &child in &self.forward[node] {
            if !visited[child] {
                visited[child] = true;
                queue.push(child);
            }
        }
        while let Some(current) = queue.pop() {
            result.push(current);
            for &child in &self.forward[current] {
                if !visited[child] {
                    visited[child] = true;
                    queue.push(child);
                }
            }
        }
        result
    }

    // -----------------------------------------------------------------------
    // Topological sort
    // -----------------------------------------------------------------------

    /// Kahn's algorithm. Returns None if cycle detected.
    pub fn topological_sort(&self) -> Option<Vec<usize>> {
        let n = self.nodes.len();
        let mut in_degree = vec![0usize; n];
        for node in &self.nodes {
            in_degree[node.id] = node.depends_on.len();
        }

        let mut queue: Vec<usize> = (0..n).filter(|&i| in_degree[i] == 0).collect();
        let mut order = Vec::with_capacity(n);

        while let Some(u) = queue.pop() {
            order.push(u);
            for &v in &self.forward[u] {
                in_degree[v] -= 1;
                if in_degree[v] == 0 {
                    queue.push(v);
                }
            }
        }

        if order.len() == n {
            Some(order)
        } else {
            None
        }
    }

    // -----------------------------------------------------------------------
    // Cycle detection (DFS 3-color)
    // -----------------------------------------------------------------------

    /// Returns the cycle path if one exists, or None.
    pub fn detect_cycle(&self) -> Option<Vec<usize>> {
        let n = self.nodes.len();
        // 0 = white, 1 = gray (in stack), 2 = black (done)
        let mut color = vec![0u8; n];
        let mut parent = vec![usize::MAX; n];

        for start in 0..n {
            if color[start] != 0 {
                continue;
            }
            let mut stack = vec![(start, 0usize)]; // (node, edge_index)
            color[start] = 1;

            while let Some(&mut (u, ref mut ei)) = stack.last_mut() {
                if *ei < self.forward[u].len() {
                    let v = self.forward[u][*ei];
                    *ei += 1;
                    if color[v] == 1 {
                        // Found cycle: trace back
                        let mut cycle = vec![v, u];
                        let mut cur = u;
                        while cur != v {
                            cur = parent[cur];
                            if cur == usize::MAX {
                                break;
                            }
                            cycle.push(cur);
                        }
                        cycle.reverse();
                        return Some(cycle);
                    } else if color[v] == 0 {
                        color[v] = 1;
                        parent[v] = u;
                        stack.push((v, 0));
                    }
                } else {
                    color[u] = 2;
                    stack.pop();
                }
            }
        }
        None
    }

    // -----------------------------------------------------------------------
    // Depth (longest path from a root)
    // -----------------------------------------------------------------------

    /// Compute the depth (longest path from any root) of each node.
    /// Roots (no dependencies) have depth 0.
    pub fn compute_depths(&self) -> Vec<usize> {
        let n = self.nodes.len();
        let mut depth = vec![0usize; n];

        if let Some(order) = self.topological_sort() {
            for &u in &order {
                for &v in &self.forward[u] {
                    if depth[v] < depth[u] + 1 {
                        depth[v] = depth[u] + 1;
                    }
                }
            }
        }
        depth
    }

    // -----------------------------------------------------------------------
    // Critical path (longest path through the DAG)
    // -----------------------------------------------------------------------

    /// Find the longest path (critical path) from any root to any leaf.
    /// Returns the path as a sequence of node indices.
    pub fn critical_path(&self) -> Vec<usize> {
        let depths = self.compute_depths();

        // Find the deepest node
        let mut max_depth = 0;
        let mut deepest = 0;
        for (i, &d) in depths.iter().enumerate() {
            if d > max_depth {
                max_depth = d;
                deepest = i;
            }
        }

        // Trace back from deepest to root
        let mut path = vec![deepest];
        let mut current = deepest;
        while !self.nodes[current].depends_on.is_empty() {
            // Pick the dependency with the highest depth
            let mut best_dep = self.nodes[current].depends_on[0];
            let mut best_depth = depths[best_dep];
            for &dep in &self.nodes[current].depends_on[1..] {
                if depths[dep] > best_depth {
                    best_depth = depths[dep];
                    best_dep = dep;
                }
            }
            path.push(best_dep);
            current = best_dep;
        }
        path.reverse();
        path
    }

    // -----------------------------------------------------------------------
    // Sugiyama-style layered layout
    // -----------------------------------------------------------------------

    /// Assign layers using a depth-based approach for proper dependency flow.
    /// Returns (layer_assignment, max_layer).
    /// Layer 0 = leftmost/topmost (roots).
    pub fn assign_layers(&self) -> (Vec<usize>, usize) {
        let depths = self.compute_depths();
        let max = depths.iter().copied().max().unwrap_or(0);
        (depths, max)
    }

    /// Minimize edge crossings within each layer using the barycenter heuristic.
    /// Takes layer assignments and returns an ordering of nodes within each layer.
    /// Returns Vec<Vec<usize>> where result[layer] = ordered node indices in that layer.
    pub fn minimize_crossings(&self, layers: &[usize], max_layer: usize) -> Vec<Vec<usize>> {
        let mut layer_nodes: Vec<Vec<usize>> = vec![Vec::new(); max_layer + 1];
        for (i, &layer) in layers.iter().enumerate() {
            layer_nodes[layer].push(i);
        }

        // Initial ordering by type priority then tags
        for layer in &mut layer_nodes {
            layer.sort_by(|&a, &b| {
                let ta = self.nodes[a].node_type.layer_order();
                let tb = self.nodes[b].node_type.layer_order();
                ta.cmp(&tb).then_with(|| {
                    // Sort by first tag (episode order)
                    let tag_a = self.nodes[a].tags.first().map(|s| s.as_str()).unwrap_or("");
                    let tag_b = self.nodes[b].tags.first().map(|s| s.as_str()).unwrap_or("");
                    tag_a.cmp(tag_b)
                })
            });
        }

        // Barycenter heuristic: iterate forward and backward passes
        for _pass in 0..4 {
            // Forward pass: order layer[i] by average position of dependencies in layer[i-1]
            for l in 1..=max_layer {
                let prev_positions = position_map(&layer_nodes[l - 1]);
                layer_nodes[l].sort_by(|&a, &b| {
                    let bc_a = barycenter(&self.nodes[a].depends_on, &prev_positions);
                    let bc_b = barycenter(&self.nodes[b].depends_on, &prev_positions);
                    bc_a.partial_cmp(&bc_b).unwrap_or(core::cmp::Ordering::Equal)
                });
            }

            // Backward pass: order layer[i] by average position of downstream in layer[i+1]
            for l in (0..max_layer).rev() {
                let next_positions = position_map(&layer_nodes[l + 1]);
                layer_nodes[l].sort_by(|&a, &b| {
                    let bc_a = barycenter(&self.forward[a], &next_positions);
                    let bc_b = barycenter(&self.forward[b], &next_positions);
                    bc_a.partial_cmp(&bc_b).unwrap_or(core::cmp::Ordering::Equal)
                });
            }
        }

        layer_nodes
    }

    /// Full Sugiyama layout: returns (x, y) positions for each node.
    /// Coordinates are normalized to [0, 1] range.
    pub fn layout(&self, width: f64, height: f64) -> Vec<(f64, f64)> {
        let n = self.nodes.len();
        if n == 0 {
            return Vec::new();
        }

        let (layers, max_layer) = self.assign_layers();
        let layer_nodes = self.minimize_crossings(&layers, max_layer);

        let mut positions = vec![(0.0, 0.0); n];

        let layer_count = layer_nodes.len();
        let x_spacing = if layer_count > 1 {
            width / (layer_count as f64 + 1.0)
        } else {
            width / 2.0
        };

        for (layer_idx, nodes_in_layer) in layer_nodes.iter().enumerate() {
            let node_count = nodes_in_layer.len();
            let y_spacing = if node_count > 1 {
                height / (node_count as f64 + 1.0)
            } else {
                height / 2.0
            };

            for (pos_idx, &node_id) in nodes_in_layer.iter().enumerate() {
                let x = x_spacing * (layer_idx as f64 + 1.0);
                let y = if node_count > 1 {
                    y_spacing * (pos_idx as f64 + 1.0)
                } else {
                    height / 2.0
                };
                positions[node_id] = (x, y);
            }
        }

        positions
    }

    // -----------------------------------------------------------------------
    // Subgraph extraction (for focused views)
    // -----------------------------------------------------------------------

    /// Extract a subgraph containing only nodes matching a predicate,
    /// plus their transitive dependencies and dependents up to a given depth.
    /// Returns the set of included node indices.
    pub fn subgraph<F>(&self, predicate: F, depth: usize) -> Vec<usize>
    where
        F: Fn(&DagNode) -> bool,
    {
        let mut included = vec![false; self.nodes.len()];
        let seeds: Vec<usize> = self.nodes.iter().filter(|n| predicate(n)).map(|n| n.id).collect();

        for &seed in &seeds {
            included[seed] = true;
        }

        // Expand upstream
        for &seed in &seeds {
            self.expand_direction(seed, depth, true, &mut included);
        }

        // Expand downstream
        for &seed in &seeds {
            self.expand_direction(seed, depth, false, &mut included);
        }

        (0..self.nodes.len()).filter(|&i| included[i]).collect()
    }

    fn expand_direction(&self, start: usize, max_depth: usize, upstream: bool, included: &mut [bool]) {
        let mut frontier = vec![(start, 0usize)];
        while let Some((node, d)) = frontier.pop() {
            if d >= max_depth {
                continue;
            }
            let neighbors = if upstream {
                &self.nodes[node].depends_on
            } else {
                &self.forward[node]
            };
            for &next in neighbors {
                if !included[next] {
                    included[next] = true;
                    frontier.push((next, d + 1));
                }
            }
        }
    }

    // -----------------------------------------------------------------------
    // Impact analysis
    // -----------------------------------------------------------------------

    /// Simulate invalidating a node: returns (cascade_count, affected_by_type).
    /// affected_by_type[i] = count of affected nodes of type i (indexed by NodeType::layer_order).
    pub fn impact_analysis(&self, node: usize) -> ImpactResult {
        let affected = self.all_downstream(node);
        let mut by_type = [0usize; 5];
        for &a in &affected {
            by_type[self.nodes[a].node_type.layer_order()] += 1;
        }
        ImpactResult {
            source: node,
            cascade_count: affected.len(),
            affected_nodes: affected,
            by_type,
        }
    }

    // -----------------------------------------------------------------------
    // Find orphan nodes (no edges in either direction)
    // -----------------------------------------------------------------------

    pub fn orphans(&self) -> Vec<usize> {
        self.nodes
            .iter()
            .filter(|n| n.depends_on.is_empty() && self.forward[n.id].is_empty())
            .map(|n| n.id)
            .collect()
    }

    // -----------------------------------------------------------------------
    // Edge crossing count (for layout quality metric)
    // -----------------------------------------------------------------------

    /// Count the number of edge crossings given a set of node positions.
    /// Lower is better for readability.
    pub fn count_crossings(&self, positions: &[(f64, f64)]) -> usize {
        let mut edges: Vec<((f64, f64), (f64, f64))> = Vec::new();
        for node in &self.nodes {
            for &dep in &node.depends_on {
                edges.push((positions[dep], positions[node.id]));
            }
        }

        let mut crossings = 0;
        for i in 0..edges.len() {
            for j in (i + 1)..edges.len() {
                if segments_intersect(edges[i].0, edges[i].1, edges[j].0, edges[j].1) {
                    crossings += 1;
                }
            }
        }
        crossings
    }

    // -----------------------------------------------------------------------
    // Dependency chain extraction
    // -----------------------------------------------------------------------

    /// Find all paths from `source` to `target`. Returns paths sorted by length.
    /// Limits to `max_paths` to prevent combinatorial explosion.
    pub fn find_paths(&self, source: usize, target: usize, max_paths: usize) -> Vec<Vec<usize>> {
        let mut result = Vec::new();
        let mut path = vec![source];
        self.dfs_paths(source, target, &mut path, &mut result, max_paths);
        result.sort_by_key(|p| p.len());
        result
    }

    fn dfs_paths(
        &self,
        current: usize,
        target: usize,
        path: &mut Vec<usize>,
        result: &mut Vec<Vec<usize>>,
        max_paths: usize,
    ) {
        if result.len() >= max_paths {
            return;
        }
        if current == target {
            result.push(path.clone());
            return;
        }
        for &next in &self.forward[current] {
            if !path.contains(&next) {
                path.push(next);
                self.dfs_paths(next, target, path, result, max_paths);
                path.pop();
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

pub struct ImpactResult {
    pub source: usize,
    pub cascade_count: usize,
    pub affected_nodes: Vec<usize>,
    /// Counts by type: [data_source, parameter, analysis, report, task]
    pub by_type: [usize; 5],
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Build a map from node_id → position_index within a layer.
fn position_map(layer: &[usize]) -> Vec<(usize, usize)> {
    layer.iter().enumerate().map(|(pos, &id)| (id, pos)).collect()
}

/// Barycenter: average position of neighbors in the given position map.
fn barycenter(neighbors: &[usize], positions: &[(usize, usize)]) -> f64 {
    if neighbors.is_empty() {
        return f64::MAX;
    }
    let mut sum = 0.0;
    let mut count = 0;
    for &n in neighbors {
        if let Some(&(_, pos)) = positions.iter().find(|&&(id, _)| id == n) {
            sum += pos as f64;
            count += 1;
        }
    }
    if count == 0 {
        f64::MAX
    } else {
        sum / count as f64
    }
}

/// Check if two line segments intersect (for crossing count).
fn segments_intersect(a1: (f64, f64), a2: (f64, f64), b1: (f64, f64), b2: (f64, f64)) -> bool {
    // Shared endpoints don't count as crossings
    if a1 == b1 || a1 == b2 || a2 == b1 || a2 == b2 {
        return false;
    }

    let d1 = cross_product(b1, b2, a1);
    let d2 = cross_product(b1, b2, a2);
    let d3 = cross_product(a1, a2, b1);
    let d4 = cross_product(a1, a2, b2);

    if ((d1 > 0.0 && d2 < 0.0) || (d1 < 0.0 && d2 > 0.0))
        && ((d3 > 0.0 && d4 < 0.0) || (d3 < 0.0 && d4 > 0.0))
    {
        return true;
    }

    false
}

fn cross_product(o: (f64, f64), a: (f64, f64), b: (f64, f64)) -> f64 {
    (a.0 - o.0) * (b.1 - o.1) - (a.1 - o.1) * (b.0 - o.0)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn make_node(id: usize, node_type: NodeType, depends_on: Vec<usize>) -> DagNode {
        DagNode {
            id,
            node_type,
            status: NodeStatus::Valid,
            depends_on,
            tags: Vec::new(),
        }
    }

    fn make_linear_dag() -> Dag {
        // 0 → 1 → 2 → 3
        Dag::new(vec![
            make_node(0, NodeType::DataSource, vec![]),
            make_node(1, NodeType::Parameter, vec![0]),
            make_node(2, NodeType::Analysis, vec![1]),
            make_node(3, NodeType::Report, vec![2]),
        ])
    }

    fn make_diamond_dag() -> Dag {
        //     0
        //    / \
        //   1   2
        //    \ /
        //     3
        Dag::new(vec![
            make_node(0, NodeType::DataSource, vec![]),
            make_node(1, NodeType::Analysis, vec![0]),
            make_node(2, NodeType::Analysis, vec![0]),
            make_node(3, NodeType::Report, vec![1, 2]),
        ])
    }

    fn make_complex_dag() -> Dag {
        // Mirrors a simplified version of the real project DAG:
        //   src0  src1  param0
        //    |  \ / |     |
        //   a0   a1      a2
        //    |   / \     /
        //   r0   r1----/
        Dag::new(vec![
            make_node(0, NodeType::DataSource, vec![]),    // src0
            make_node(1, NodeType::DataSource, vec![]),    // src1
            make_node(2, NodeType::Parameter, vec![]),     // param0
            make_node(3, NodeType::Analysis, vec![0]),     // a0
            make_node(4, NodeType::Analysis, vec![0, 1]),  // a1
            make_node(5, NodeType::Analysis, vec![2]),     // a2
            make_node(6, NodeType::Report, vec![3, 4]),    // r0
            make_node(7, NodeType::Report, vec![4, 5]),    // r1
        ])
    }

    // -- Construction --

    #[test]
    fn test_new_empty() {
        let dag = Dag::new(vec![]);
        assert_eq!(dag.node_count(), 0);
        assert_eq!(dag.edge_count(), 0);
    }

    #[test]
    fn test_new_counts() {
        let dag = make_linear_dag();
        assert_eq!(dag.node_count(), 4);
        assert_eq!(dag.edge_count(), 3);
    }

    #[test]
    fn test_forward_index() {
        let dag = make_diamond_dag();
        assert_eq!(dag.downstream(0), &[1, 2]);
        assert!(dag.downstream(3).is_empty());
    }

    // -- Upstream / Downstream --

    #[test]
    fn test_all_upstream_leaf() {
        let dag = make_linear_dag();
        let mut up = dag.all_upstream(3);
        up.sort();
        assert_eq!(up, vec![0, 1, 2]);
    }

    #[test]
    fn test_all_upstream_root() {
        let dag = make_linear_dag();
        assert!(dag.all_upstream(0).is_empty());
    }

    #[test]
    fn test_all_downstream_root() {
        let dag = make_linear_dag();
        let mut down = dag.all_downstream(0);
        down.sort();
        assert_eq!(down, vec![1, 2, 3]);
    }

    #[test]
    fn test_all_downstream_leaf() {
        let dag = make_linear_dag();
        assert!(dag.all_downstream(3).is_empty());
    }

    #[test]
    fn test_diamond_upstream() {
        let dag = make_diamond_dag();
        let mut up = dag.all_upstream(3);
        up.sort();
        assert_eq!(up, vec![0, 1, 2]);
    }

    #[test]
    fn test_diamond_downstream() {
        let dag = make_diamond_dag();
        let mut down = dag.all_downstream(0);
        down.sort();
        assert_eq!(down, vec![1, 2, 3]);
    }

    // -- Topological sort --

    #[test]
    fn test_topo_sort_linear() {
        let dag = make_linear_dag();
        let order = dag.topological_sort().unwrap();
        // Must respect: 0 before 1 before 2 before 3
        for i in 0..order.len() - 1 {
            assert!(
                order.iter().position(|&x| x == i).unwrap()
                    < order.iter().position(|&x| x == i + 1).unwrap()
            );
        }
    }

    #[test]
    fn test_topo_sort_diamond() {
        let dag = make_diamond_dag();
        let order = dag.topological_sort().unwrap();
        assert_eq!(order[0], 0); // root first
        assert_eq!(*order.last().unwrap(), 3); // leaf last
    }

    // -- Cycle detection --

    #[test]
    fn test_no_cycle() {
        let dag = make_linear_dag();
        assert!(dag.detect_cycle().is_none());
    }

    #[test]
    fn test_detect_cycle() {
        // Create a cycle: 0 → 1 → 2 → 0
        let dag = Dag::new(vec![
            make_node(0, NodeType::Analysis, vec![2]),
            make_node(1, NodeType::Analysis, vec![0]),
            make_node(2, NodeType::Analysis, vec![1]),
        ]);
        let cycle = dag.detect_cycle();
        assert!(cycle.is_some());
    }

    // -- Depth computation --

    #[test]
    fn test_depths_linear() {
        let dag = make_linear_dag();
        assert_eq!(dag.compute_depths(), vec![0, 1, 2, 3]);
    }

    #[test]
    fn test_depths_diamond() {
        let dag = make_diamond_dag();
        let depths = dag.compute_depths();
        assert_eq!(depths[0], 0);
        assert_eq!(depths[1], 1);
        assert_eq!(depths[2], 1);
        assert_eq!(depths[3], 2);
    }

    // -- Critical path --

    #[test]
    fn test_critical_path_linear() {
        let dag = make_linear_dag();
        assert_eq!(dag.critical_path(), vec![0, 1, 2, 3]);
    }

    #[test]
    fn test_critical_path_diamond() {
        let dag = make_diamond_dag();
        let path = dag.critical_path();
        assert_eq!(path.len(), 3); // 0 → 1or2 → 3
        assert_eq!(path[0], 0);
        assert_eq!(*path.last().unwrap(), 3);
    }

    // -- Layout --

    #[test]
    fn test_layout_linear() {
        let dag = make_linear_dag();
        let pos = dag.layout(1000.0, 600.0);
        assert_eq!(pos.len(), 4);
        // x should increase along the chain
        for i in 0..3 {
            assert!(pos[i].0 < pos[i + 1].0, "x should increase: {:?}", pos);
        }
    }

    #[test]
    fn test_layout_diamond() {
        let dag = make_diamond_dag();
        let pos = dag.layout(1000.0, 600.0);
        // Root (0) leftmost, leaf (3) rightmost
        assert!(pos[0].0 < pos[3].0);
        // 1 and 2 at same x (same layer)
        assert!((pos[1].0 - pos[2].0).abs() < 1.0);
        // 1 and 2 at different y
        assert!((pos[1].1 - pos[2].1).abs() > 1.0);
    }

    #[test]
    fn test_layout_empty() {
        let dag = Dag::new(vec![]);
        assert!(dag.layout(100.0, 100.0).is_empty());
    }

    // -- Subgraph --

    #[test]
    fn test_subgraph_single() {
        let dag = make_complex_dag();
        let sub = dag.subgraph(|n| n.id == 4, 0);
        assert_eq!(sub, vec![4]);
    }

    #[test]
    fn test_subgraph_with_depth() {
        let dag = make_complex_dag();
        let mut sub = dag.subgraph(|n| n.id == 4, 1);
        sub.sort();
        // id=4 deps: [0, 1], downstream: [6, 7]
        assert!(sub.contains(&4));
        assert!(sub.contains(&0));
        assert!(sub.contains(&1));
        assert!(sub.contains(&6));
        assert!(sub.contains(&7));
    }

    // -- Impact analysis --

    #[test]
    fn test_impact_root() {
        let dag = make_linear_dag();
        let impact = dag.impact_analysis(0);
        assert_eq!(impact.cascade_count, 3);
        assert_eq!(impact.by_type[NodeType::Parameter.layer_order()], 1);
        assert_eq!(impact.by_type[NodeType::Analysis.layer_order()], 1);
        assert_eq!(impact.by_type[NodeType::Report.layer_order()], 1);
    }

    #[test]
    fn test_impact_leaf() {
        let dag = make_linear_dag();
        let impact = dag.impact_analysis(3);
        assert_eq!(impact.cascade_count, 0);
    }

    #[test]
    fn test_impact_complex_param() {
        let dag = make_complex_dag();
        let impact = dag.impact_analysis(2); // param0
        // param0 → a2 → r1
        assert_eq!(impact.cascade_count, 2);
    }

    // -- Orphans --

    #[test]
    fn test_orphans_none() {
        let dag = make_linear_dag();
        assert!(dag.orphans().is_empty());
    }

    #[test]
    fn test_orphans_found() {
        let mut nodes = vec![
            make_node(0, NodeType::DataSource, vec![]),
            make_node(1, NodeType::Analysis, vec![0]),
            make_node(2, NodeType::Report, vec![]), // orphan
        ];
        nodes[2].depends_on = vec![];
        let dag = Dag::new(nodes);
        assert_eq!(dag.orphans(), vec![2]);
    }

    // -- Path finding --

    #[test]
    fn test_find_paths_linear() {
        let dag = make_linear_dag();
        let paths = dag.find_paths(0, 3, 10);
        assert_eq!(paths.len(), 1);
        assert_eq!(paths[0], vec![0, 1, 2, 3]);
    }

    #[test]
    fn test_find_paths_diamond() {
        let dag = make_diamond_dag();
        let paths = dag.find_paths(0, 3, 10);
        assert_eq!(paths.len(), 2); // via 1 and via 2
    }

    #[test]
    fn test_find_paths_no_path() {
        let dag = make_linear_dag();
        let paths = dag.find_paths(3, 0, 10); // reverse direction
        assert!(paths.is_empty());
    }

    // -- Edge crossings --

    #[test]
    fn test_crossing_count_no_crossings() {
        let dag = make_linear_dag();
        let pos = dag.layout(1000.0, 600.0);
        assert_eq!(dag.count_crossings(&pos), 0);
    }

    // -- NodeType / NodeStatus --

    #[test]
    fn test_node_type_roundtrip() {
        for t in &[
            NodeType::DataSource,
            NodeType::Parameter,
            NodeType::Analysis,
            NodeType::Report,
            NodeType::Task,
        ] {
            assert_eq!(NodeType::parse(t.as_str()), Some(*t));
        }
    }

    #[test]
    fn test_node_status_roundtrip() {
        for s in &[NodeStatus::Valid, NodeStatus::Stale, NodeStatus::Pending] {
            assert_eq!(NodeStatus::parse(s.as_str()), Some(*s));
        }
    }
}
