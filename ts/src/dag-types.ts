/** DAG node types for task/analysis dependency tracking */

export type NodeType = "data_source" | "parameter" | "analysis" | "report" | "task";

export type NodeStatus = "valid" | "stale" | "pending";

export interface DagNode {
  id: string;
  type: NodeType;
  title: string;
  /** IDs of nodes this node depends on */
  dependsOn: string[];
  /** Current validation status */
  status: NodeStatus;
  /** Version counter (incremented on updates) */
  version: number;
  /** ISO timestamp of last computation/validation */
  lastValidated?: string;
  /** Optional tags for filtering (e.g., ["episode:01", "transfer:01"]) */
  tags?: string[];
  /** Optional notes */
  notes?: string;
}

export interface DagEvent {
  timestamp: string;
  action: "node_added" | "node_updated" | "node_removed" | "status_changed" | "dependency_added" | "dependency_removed";
  nodeId: string;
  detail?: string;
}

export interface DagState {
  /** All nodes indexed by ID */
  nodes: Record<string, DagNode>;
  /** Schema version for future migrations */
  schemaVersion: number;
}
