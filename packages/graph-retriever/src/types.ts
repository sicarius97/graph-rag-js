import type { Edge } from './edges/index';

/**
 * Represents a node in the traversal graph.
 * 
 * The Node class contains information about a document
 * during graph traversal, including its depth, embedding, edges, and metadata.
 */
export interface Node {
  /** The unique identifier of the document represented by this node */
  id: string;
  /** The content */
  content: string;
  /** The depth (number of edges) through which this node was discovered */
  depth: number;
  /** The similarity score */
  similarityScore: number;
  /** The embedding vector of the document, used for similarity calculations */
  embedding: number[];
  /** Metadata from the original document */
  metadata: Record<string, any>;
  /** Incoming edges that link to this node */
  incomingEdges: Set<Edge>;
  /** Edges that this node links to */
  outgoingEdges: Set<Edge>;
  /** Additional metadata to override or augment the original document metadata during traversal */
  extraMetadata: Record<string, any>;
}

/**
 * Create a new Node instance.
 */
export function createNode(options: {
  id: string;
  content: string;
  depth: number;
  similarityScore: number;
  embedding: number[];
  metadata?: Record<string, any>;
  incomingEdges?: Set<Edge>;
  outgoingEdges?: Set<Edge>;
  extraMetadata?: Record<string, any>;
}): Node {
  const {
    id,
    content,
    depth,
    similarityScore,
    embedding,
    metadata = {},
    incomingEdges = new Set(),
    outgoingEdges = new Set(),
    extraMetadata = {},
  } = options;

  return {
    id,
    content,
    depth,
    similarityScore,
    embedding,
    metadata,
    incomingEdges,
    outgoingEdges,
    extraMetadata,
  };
}
