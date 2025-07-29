import type { Node } from '../types.js';
import { Strategy, NodeTracker } from './base.js';

/**
 * Internal class for managing scored nodes with heap behavior
 */
class ScoredNode {
  constructor(public score: number, public node: Node) {}

  isLessThan(other: ScoredNode): boolean {
    return other.score < this.score;
  }
}

/**
 * Simple min-heap implementation for scored nodes
 */
class MinHeap {
  private items: ScoredNode[] = [];

  push(item: ScoredNode): void {
    this.items.push(item);
    this.bubbleUp(this.items.length - 1);
  }

  pop(): ScoredNode | undefined {
    if (this.items.length === 0) return undefined;
    if (this.items.length === 1) return this.items.pop();

    const result = this.items[0];
    this.items[0] = this.items.pop()!;
    this.bubbleDown(0);
    return result;
  }

  get length(): number {
    return this.items.length;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (!this.items[index].isLessThan(this.items[parentIndex])) break;
      
      [this.items[index], this.items[parentIndex]] = [this.items[parentIndex], this.items[index]];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      if (leftChild < this.items.length && this.items[leftChild].isLessThan(this.items[smallest])) {
        smallest = leftChild;
      }

      if (rightChild < this.items.length && this.items[rightChild].isLessThan(this.items[smallest])) {
        smallest = rightChild;
      }

      if (smallest === index) break;

      [this.items[index], this.items[smallest]] = [this.items[smallest], this.items[index]];
      index = smallest;
    }
  }
}

/**
 * Scored traversal strategy.
 * 
 * This strategy uses a scoring function to select nodes using a local maximum
 * approach. In each iteration, it chooses the top scoring nodes available and
 * then traverses the connected nodes.
 */
export class Scored extends Strategy {
  private nodes = new MinHeap();
  public perIterationLimit?: number;

  constructor(
    public scorer: (node: Node) => number,
    options: {
      selectK?: number;
      startK?: number;
      adjacentK?: number;
      maxTraverse?: number;
      maxDepth?: number;
      perIterationLimit?: number;
      k?: number; // deprecated
    } = {}
  ) {
    super(options);
    this.perIterationLimit = options.perIterationLimit;
  }

  iteration(options: { nodes: Iterable<Node>; tracker: NodeTracker }): void {
    const { nodes, tracker } = options;

    for (const node of nodes) {
      this.nodes.push(new ScoredNode(this.scorer(node), node));
    }

    let limit = tracker.numRemaining;
    if (this.perIterationLimit) {
      limit = Math.min(limit, this.perIterationLimit);
    }

    while (limit > 0 && this.nodes.length > 0) {
      const highest = this.nodes.pop()!;
      const node = highest.node;
      node.extraMetadata._score = highest.score;
      limit -= tracker.selectAndTraverse([node]);
    }
  }

  finalizeNodes(selected: Iterable<Node>): Iterable<Node> {
    const sortedSelected = Array.from(selected).sort((a, b) => {
      const scoreA = a.extraMetadata._score || 0;
      const scoreB = b.extraMetadata._score || 0;
      return scoreB - scoreA; // Descending order
    });
    
    return super.finalizeNodes(sortedSelected);
  }
}
