import type { Node } from '../types.js';
import { Strategy, NodeTracker } from './base.js';

/**
 * Eager traversal strategy (breadth-first).
 * 
 * This strategy selects all discovered nodes at each traversal step. It ensures
 * breadth-first traversal by processing nodes layer by layer, which is useful for
 * scenarios where all nodes at the current depth should be explored before proceeding
 * to the next depth.
 */
export class Eager extends Strategy {
  iteration(options: { nodes: Iterable<Node>; tracker: NodeTracker }): void {
    const { nodes, tracker } = options;
    tracker.selectAndTraverse(nodes);
  }
}
