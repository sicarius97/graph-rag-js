import type { Content } from './content.js';
import type { Adapter } from './adapters/index.js';
import type { Edge, EdgeFunction, EdgeSpec, MetadataEdgeFunction } from './edges/index.js';
import type { Strategy, NodeTracker } from './strategies/index.js';
import type { Node } from './types.js';
import { MetadataEdgeFunction as MetadataEdgeFunctionImpl } from './edges/metadata.js';
import { createNode } from './types.js';
import { NodeTracker as NodeTrackerImpl } from './strategies/base.js';
import { cosineSimilarity } from './utils/math.js';

/**
 * Perform a graph traversal to retrieve nodes for a specific query.
 */
export async function traverse(
  query: string,
  options: {
    edges: EdgeSpec[] | EdgeFunction;
    strategy: Strategy;
    store: Adapter;
    metadataFilter?: Record<string, any>;
    initialRootIds?: string[];
    storeKwargs?: Record<string, any>;
  }
): Promise<Node[]> {
  const traversal = new Traversal(query, options);
  return await traversal.traverse();
}

/**
 * Alias for traverse (async is default in JavaScript)
 */
export const atraverse = traverse;

/**
 * Internal traversal implementation
 */
class Traversal {
  private query: string;
  private edgeFunction: EdgeFunction;
  private strategy: Strategy;
  private store: Adapter;
  private metadataFilter?: Record<string, any>;
  private initialRootIds: string[];
  private storeKwargs: Record<string, any>;

  private used = false;
  private visitedEdges = new Set<Edge>();
  private edgeDepths = new Map<Edge, number>();
  private discoveredNodeIds = new Set<string>();
  private nodeTracker: NodeTracker;

  constructor(
    query: string,
    options: {
      edges: EdgeSpec[] | EdgeFunction;
      strategy: Strategy;
      store: Adapter;
      metadataFilter?: Record<string, any>;
      initialRootIds?: string[];
      storeKwargs?: Record<string, any>;
    }
  ) {
    const {
      edges,
      strategy,
      store,
      metadataFilter,
      initialRootIds = [],
      storeKwargs = {},
    } = options;

    this.query = query;
    this.strategy = strategy; // Use strategy directly
    this.store = store;
    this.metadataFilter = metadataFilter;
    this.initialRootIds = initialRootIds;
    this.storeKwargs = storeKwargs;

    // Set up edge function
    if (Array.isArray(edges)) {
      const metadataEdgeFunction = new MetadataEdgeFunctionImpl(edges);
      this.edgeFunction = (content: Content) => metadataEdgeFunction.call(content);
    } else if (typeof edges === 'function') {
      this.edgeFunction = edges;
    } else {
      throw new Error(`Invalid edges: ${edges}`);
    }

    this.nodeTracker = new NodeTrackerImpl(this.strategy.selectK, this.strategy.maxDepth);
  }

  async traverse(): Promise<Node[]> {
    if (this.used) {
      throw new Error('Traversal instances can only be used once');
    }
    this.used = true;

    // Fetch initial candidates
    const initialCandidates = await this.fetchInitialCandidates();
    
    if (initialCandidates.length > 0) {
      // Convert to nodes and process with strategy
      const nodes = this.contentsToNewNodes(initialCandidates, { depth: 0 });
      this.strategy.iteration({ nodes, tracker: this.nodeTracker });
    }

    // Main traversal loop
    while (!this.nodeTracker.shouldStopTraversal()) {
      const currentNodes = Array.from(this.nodeTracker.toTraverse.values());
      this.nodeTracker.toTraverse.clear();

      if (currentNodes.length === 0) {
        break;
      }

      // Get edges from current nodes
      const nextEdges = this.selectNextEdges(
        new Map(currentNodes.map(n => [n.id, n]))
      );

      if (nextEdges.size === 0) {
        break;
      }

      // Fetch adjacent content
      const adjacentContent = await this.fetchAdjacent(nextEdges);
      
      if (adjacentContent.length > 0) {
        const newNodes = this.contentsToNewNodes(adjacentContent);
        this.strategy.iteration({ nodes: newNodes, tracker: this.nodeTracker });
      }
    }

    return Array.from(this.strategy.finalizeNodes(this.nodeTracker.selected));
  }

  private async fetchInitialCandidates(): Promise<Content[]> {
    const tasks: Promise<Content[]>[] = [];

    // Add initial root documents
    if (this.initialRootIds.length > 0) {
      tasks.push(this.store.get(this.initialRootIds, { filter: this.metadataFilter }));
    }

    // Add similarity search results
    if (this.strategy.startK > 0) {
      tasks.push(
        this.store.searchWithEmbedding(this.query, {
          k: this.strategy.startK,
          filter: this.metadataFilter,
          ...this.storeKwargs,
        }).then(result => {
          this.strategy.queryEmbedding = result.queryEmbedding;
          return result.contents;
        })
      );
    }

    const results = await Promise.all(tasks);
    return results.flat();
  }

  private async fetchAdjacent(edges: Set<Edge>): Promise<Content[]> {
    if (!this.strategy.queryEmbedding.length) {
      throw new Error('Query embedding not available');
    }

    const content = await this.store.adjacent(edges, this.strategy.queryEmbedding, {
      k: this.strategy.adjacentK,
      filter: this.metadataFilter,
      ...this.storeKwargs,
    });

    return Array.from(content);
  }

  private contentsToNewNodes(
    contents: Iterable<Content>,
    options: { depth?: number } = {}
  ): Node[] {
    const { depth } = options;
    const contentDict = new Map<string, Content>();
    
    for (const content of contents) {
      if (!this.discoveredNodeIds.has(content.id)) {
        contentDict.set(content.id, content);
      }
    }

    if (contentDict.size === 0) {
      return [];
    }

    // Compute scores
    const scores = cosineSimilarity(
      [this.strategy.queryEmbedding],
      Array.from(contentDict.values()).map(c => c.embedding)
    )[0];

    // Create the nodes
    const nodes: Node[] = [];
    const contentArray = Array.from(contentDict.values());
    
    for (let i = 0; i < contentArray.length; i++) {
      const content = contentArray[i];
      const score = scores[i];

      // Determine incoming/outgoing edges
      const edges = this.edgeFunction(content);

      // Compute the depth
      let nodeDepth = depth;
      if (nodeDepth === undefined) {
        nodeDepth = Math.min(
          ...Array.from(edges.incoming)
            .map(e => this.edgeDepths.get(e))
            .filter((d): d is number => d !== undefined),
          0
        );
      }

      nodes.push(
        createNode({
          id: content.id,
          content: content.content,
          depth: nodeDepth,
          similarityScore: score,
          embedding: content.embedding,
          metadata: content.metadata,
          incomingEdges: edges.incoming,
          outgoingEdges: edges.outgoing,
        })
      );
    }

    // Update discovered node IDs
    for (const id of contentDict.keys()) {
      this.discoveredNodeIds.add(id);
    }

    return nodes;
  }

  private selectNextEdges(nodes: Map<string, Node>): Set<Edge> {
    const edges = new Set<Edge>();

    for (const node of nodes.values()) {
      for (const edge of node.outgoingEdges) {
        if (!this.visitedEdges.has(edge)) {
          edges.add(edge);
          this.visitedEdges.add(edge);
          this.edgeDepths.set(edge, node.depth + 1);
        }
      }
    }

    return edges;
  }
}
