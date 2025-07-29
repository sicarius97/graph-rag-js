import type { Node } from '../types.js';

export const DEFAULT_SELECT_K = 5;

/**
 * Helper class initiating node selection and traversal.
 * 
 * Call .select(nodes) to add nodes to the result set.
 * Call .traverse(nodes) to add nodes to the next traversal.
 * Call .selectAndTraverse(nodes) to add nodes to the result set and the next traversal.
 */
export class NodeTracker {
  private selectK: number;
  private maxDepth?: number;
  private visitedNodeIds = new Set<string>();
  public toTraverse = new Map<string, Node>();
  public selected: Node[] = [];

  constructor(selectK: number, maxDepth?: number) {
    this.selectK = selectK;
    this.maxDepth = maxDepth;
  }

  /** The remaining number of nodes to be selected */
  get numRemaining(): number {
    return Math.max(this.selectK - this.selected.length, 0);
  }

  /** Select nodes to be included in the result set */
  select(nodes: Iterable<Node>): void {
    for (const node of nodes) {
      node.extraMetadata._depth = node.depth;
      node.extraMetadata._similarity_score = node.similarityScore;
    }
    this.selected.push(...nodes);
  }

  /**
   * Select nodes to be included in the next traversal.
   * 
   * @returns Number of nodes added for traversal
   * 
   * Notes:
   * - Nodes are only added if they have not been visited before
   * - Nodes are only added if they do not exceed the maximum depth
   * - If no new nodes are chosen for traversal, or selected for output, then the traversal will stop
   * - Traversal will also stop if the number of selected nodes reaches the selectK limit
   */
  traverse(nodes: Iterable<Node>): number {
    const newNodes = new Map<string, Node>();
    
    for (const node of nodes) {
      if (this.notVisited(node.id) && (this.maxDepth === undefined || node.depth < this.maxDepth)) {
        newNodes.set(node.id, node);
      }
    }
    
    for (const [id, node] of newNodes) {
      this.toTraverse.set(id, node);
      this.visitedNodeIds.add(id);
    }
    
    return newNodes.size;
  }

  /**
   * Select nodes to be included in the result set and the next traversal.
   * 
   * @returns Number of nodes added for traversal
   */
  selectAndTraverse(nodes: Iterable<Node>): number {
    this.select(nodes);
    return this.traverse(nodes);
  }

  /** Return true if the node has not been visited */
  private notVisited(id: string): boolean {
    return !this.visitedNodeIds.has(id);
  }

  /** Return true if traversal should be stopped */
  shouldStopTraversal(): boolean {
    return this.numRemaining === 0 || this.toTraverse.size === 0;
  }
}

/**
 * Interface for configuring node selection and traversal strategies.
 * 
 * This base class defines how nodes are selected, traversed, and finalized during
 * a graph traversal. Implementations can customize behaviors like limiting the depth
 * of traversal, scoring nodes, or selecting the next set of nodes for exploration.
 */
export abstract class Strategy {
  /** Maximum number of nodes to select and return during traversal */
  selectK: number = DEFAULT_SELECT_K;
  /** Number of nodes to fetch via similarity for starting the traversal */
  startK: number = 4;
  /** Number of nodes to fetch for each outgoing edge */
  adjacentK: number = 10;
  /** Maximum number of nodes to traverse outgoing edges from before returning */
  maxTraverse?: number;
  /** Maximum traversal depth */
  maxDepth?: number;
  /** @deprecated Use selectK instead */
  k: number = DEFAULT_SELECT_K;

  queryEmbedding: number[] = [];

  constructor(options: {
    selectK?: number;
    startK?: number;
    adjacentK?: number;
    maxTraverse?: number;
    maxDepth?: number;
    k?: number; // deprecated
  } = {}) {
    const { selectK, startK, adjacentK, maxTraverse, maxDepth, k } = options;
    
    if (selectK !== undefined) {
      this.selectK = selectK;
    } else if (k !== undefined) {
      // Allow passing the deprecated 'k' value instead of 'selectK'
      this.selectK = k;
    }
    
    if (startK !== undefined) this.startK = startK;
    if (adjacentK !== undefined) this.adjacentK = adjacentK;
    if (maxTraverse !== undefined) this.maxTraverse = maxTraverse;
    if (maxDepth !== undefined) this.maxDepth = maxDepth;
    
    this.k = this.selectK; // Keep in sync for backward compatibility
  }

  /**
   * Process the newly discovered nodes on each iteration.
   * 
   * This method should call tracker.traverse() and/or tracker.select()
   * as appropriate to update the nodes that need to be traversed in this iteration
   * or selected at the end of the retrieval, respectively.
   */
  abstract iteration(options: { nodes: Iterable<Node>; tracker: NodeTracker }): void;

  /**
   * Finalize the selected nodes.
   * 
   * This method is called before returning the final set of nodes. It allows
   * the strategy to perform any final processing or re-ranking of the selected
   * nodes.
   * 
   * The default implementation returns the first selectK selected nodes
   * without any additional processing.
   */
  finalizeNodes(selected: Iterable<Node>): Iterable<Node> {
    return Array.from(selected).slice(0, this.selectK);
  }

  /**
   * Build a strategy for a retrieval operation.
   * 
   * Combines a base strategy with any provided keyword arguments to
   * create a customized traversal strategy.
   */
  static build<T extends Strategy>(
    baseStrategy: T,
    options: Partial<{
      selectK: number;
      startK: number;
      adjacentK: number;
      maxTraverse: number;
      maxDepth: number;
      k: number; // deprecated
      strategy: Strategy;
    }> = {}
  ): T {
    const { strategy, k, selectK, ...rest } = options;
    
    // Check if there is a new strategy to use. Otherwise, use the base.
    let result: T;
    if (strategy) {
      if (!(strategy instanceof Strategy)) {
        throw new Error(
          `Unsupported 'strategy' type. Must be a sub-class of Strategy`
        );
      }
      result = strategy as T;
    } else if (baseStrategy) {
      result = baseStrategy;
    } else {
      throw new Error("'strategy' must be set");
    }

    // Apply the options to update the strategy
    if (k !== undefined) {
      result.selectK = k;
      result.k = k;
    }
    if (selectK !== undefined) {
      result.selectK = selectK;
      result.k = selectK;
    }
    
    Object.assign(result, rest);
    
    return result;
  }
}
