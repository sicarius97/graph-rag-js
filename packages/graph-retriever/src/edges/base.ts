import type { Content } from '../content.js';

/**
 * An edge identifies properties necessary for finding matching nodes.
 * Sub-classes should be hashable.
 */
export abstract class Edge {
  abstract readonly type: string;
  
  // For hash/equality comparison
  abstract toString(): string;
  
  equals(other: Edge): boolean {
    return this.toString() === other.toString();
  }
}

/**
 * Link to nodes with specific metadata.
 * 
 * A MetadataEdge connects to nodes with either:
 * - node.metadata[field] == value
 * - node.metadata[field] CONTAINS value (if the metadata is a collection).
 */
export class MetadataEdge extends Edge {
  readonly type = 'metadata';
  
  constructor(
    public readonly incomingField: string,
    public readonly value: any
  ) {
    super();
    // Freeze nested objects for immutability
    if (typeof this.value === 'object' && this.value !== null) {
      Object.freeze(this.value);
    }
  }
  
  toString(): string {
    return `MetadataEdge(${this.incomingField}=${JSON.stringify(this.value)})`;
  }
}

/**
 * An IdEdge connects to nodes with node.id == id.
 */
export class IdEdge extends Edge {
  readonly type = 'id';
  
  constructor(public readonly id: string) {
    super();
  }
  
  toString(): string {
    return `IdEdge(${this.id})`;
  }
}

/**
 * Information about the incoming and outgoing edges.
 */
export interface Edges {
  /** Incoming edges that link to this node */
  incoming: Set<Edge>;
  /** Edges that this node links to */
  outgoing: Set<Edge>;
}

/**
 * A function for extracting edges from nodes.
 * Implementations should be deterministic.
 */
export type EdgeFunction = (content: Content) => Edges;
