import type { Content } from '../content.js';
import type { Edge, IdEdge, MetadataEdge } from '../edges/index.js';
import { runInExecutor } from '../utils/runInExecutor.js';
import { topK } from '../utils/topK.js';

/**
 * Base adapter for integrating vector stores with the graph retriever system.
 * 
 * This class provides a foundation for custom adapters, enabling consistent
 * interaction with various vector store implementations.
 */
export abstract class Adapter {
  constructor() {}

  /**
   * Return content items most similar to the query.
   * Also returns the embedded query vector.
   * 
   * @param query - Input text
   * @param k - Number of content items to return
   * @param filter - Filter on the metadata to apply
   * @param kwargs - Additional keyword arguments
   * @returns Query embedding and list of up to k content items most similar to the query vector
   */
  abstract searchWithEmbedding(
    query: string,
    options?: {
      k?: number;
      filter?: Record<string, any>;
      [key: string]: any;
    }
  ): Promise<{ queryEmbedding: number[]; contents: Content[] }>;

  /**
   * Return content items most similar to the given embedding.
   * 
   * @param embedding - The embedding vector to search for
   * @param k - Number of content items to return
   * @param filter - Filter on the metadata to apply
   * @param kwargs - Additional keyword arguments
   * @returns List of up to k content items most similar to the embedding vector
   */
  abstract search(
    embedding: number[],
    options?: {
      k?: number;
      filter?: Record<string, any>;
      [key: string]: any;
    }
  ): Promise<Content[]>;

  /**
   * Retrieve content items by their IDs.
   * 
   * @param ids - List of content IDs to retrieve
   * @param filter - Filter on the metadata to apply
   * @param kwargs - Additional keyword arguments
   * @returns List of content items with the given IDs that match the filter
   */
  abstract get(
    ids: string[],
    options?: {
      filter?: Record<string, any>;
      [key: string]: any;
    }
  ): Promise<Content[]>;

  /**
   * Retrieve content items adjacent to the given edges.
   * 
   * @param edges - Set of edges to find adjacent content for
   * @param queryEmbedding - The query embedding for ranking results
   * @param k - Maximum number of content items to return
   * @param filter - Filter on the metadata to apply
   * @param kwargs - Additional keyword arguments
   * @returns Iterable of content items adjacent to the given edges
   */
  async adjacent(
    edges: Set<Edge>,
    queryEmbedding: number[],
    options?: {
      k?: number;
      filter?: Record<string, any>;
      [key: string]: any;
    }
  ): Promise<Content[]> {
    const { k = 4, filter, ...kwargs } = options || {};
    const results: Content[] = [];
    const ids: string[] = [];

    for (const edge of edges) {
      if (this.isMetadataEdge(edge)) {
        const docs = await this.search(queryEmbedding, {
          k,
          filter: this.metadataFilter({ edge, baseFilter: filter }),
          ...kwargs,
        });
        results.push(...docs);
      } else if (this.isIdEdge(edge)) {
        ids.push(edge.id);
      } else {
        throw new Error(`Unsupported edge: ${edge}`);
      }
    }

    if (ids.length > 0) {
      const idResults = await this.get(ids, { filter });
      results.push(...idResults);
    }

    return topK(results, { embedding: queryEmbedding, k });
  }

  /**
   * Create a metadata filter combining base filter with edge-specific constraints.
   */
  private metadataFilter(options: {
    edge: Edge;
    baseFilter?: Record<string, any>;
  }): Record<string, any> {
    const { edge, baseFilter } = options;

    if (this.isMetadataEdge(edge)) {
      const edgeFilter = { [edge.incomingField]: edge.value };
      
      if (!baseFilter) {
        return edgeFilter;
      }

      // Merge filters - in a real implementation, this might need more sophisticated merging
      return { ...baseFilter, ...edgeFilter };
    }

    return baseFilter || {};
  }

  /**
   * Type guard for MetadataEdge
   */
  private isMetadataEdge(edge: Edge): edge is MetadataEdge {
    return edge.type === 'metadata';
  }

  /**
   * Type guard for IdEdge
   */
  private isIdEdge(edge: Edge): edge is IdEdge {
    return edge.type === 'id';
  }
}
