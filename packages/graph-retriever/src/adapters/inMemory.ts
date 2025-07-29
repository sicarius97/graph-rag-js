import type { Content } from '../content.js';
import { Adapter } from './base.js';
import { cosineSimilarity } from '../utils/math.js';

/**
 * Embedding function type
 */
export type EmbeddingFunction = (text: string) => number[];

/**
 * Base class for in-memory adapters that use dict-based metadata filters.
 * These are intended (mostly) for demonstration purposes and testing.
 */
export abstract class InMemoryBase extends Adapter {
  protected store: Map<string, Content>;
  protected embedding: EmbeddingFunction;

  constructor(embedding: EmbeddingFunction, content: Content[]) {
    super();
    this.store = new Map(content.map(c => [c.id, c]));
    this.embedding = embedding;
  }

  async searchWithEmbedding(
    query: string,
    options?: {
      k?: number;
      filter?: Record<string, any>;
      [key: string]: any;
    }
  ): Promise<{ queryEmbedding: number[]; contents: Content[] }> {
    const { k = 4, filter, ...kwargs } = options || {};
    
    const queryEmbedding = this.embedding(query);
    const contents = await this.search(queryEmbedding, { k, filter, ...kwargs });
    
    return { queryEmbedding, contents };
  }

  async search(
    embedding: number[],
    options?: {
      k?: number;
      filter?: Record<string, any>;
      [key: string]: any;
    }
  ): Promise<Content[]> {
    const { k = 4, filter } = options || {};
    
    // Get all docs with fixed order in list
    const candidates = this.matchingContent(filter);

    if (candidates.length === 0) {
      return [];
    }

    const similarity = cosineSimilarity([embedding], candidates.map(c => c.embedding))[0];

    // Get the indices ordered by similarity score
    const indexedSimilarity = similarity.map((score, index) => ({ score, index }));
    indexedSimilarity.sort((a, b) => b.score - a.score);
    const topKIndices = indexedSimilarity.slice(0, k);

    return topKIndices.map(({ index }) => candidates[index]);
  }

  async get(
    ids: string[],
    options?: {
      filter?: Record<string, any>;
      [key: string]: any;
    }
  ): Promise<Content[]> {
    const { filter } = options || {};
    
    return ids
      .map(id => this.store.get(id))
      .filter((content): content is Content => content !== undefined)
      .filter(content => this.matches(filter, content));
  }

  /**
   * Return a list of content matching the given filters.
   */
  protected matchingContent(filter?: Record<string, any>): Content[] {
    if (filter) {
      return Array.from(this.store.values()).filter(c => this.matches(filter, c));
    } else {
      return Array.from(this.store.values());
    }
  }

  /**
   * Return whether content matches the given filter.
   */
  protected matches(filter: Record<string, any> | undefined, content: Content): boolean {
    if (!filter) {
      return true;
    }

    for (const [key, filterValue] of Object.entries(filter)) {
      let contentValue: any = content.metadata;
      
      for (const keyPart of key.split('.')) {
        if (contentValue && typeof contentValue === 'object' && keyPart in contentValue) {
          contentValue = contentValue[keyPart];
        } else {
          contentValue = undefined;
          break;
        }
      }
      
      if (!this.valueMatches(filterValue, contentValue)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Return whether the content_value matches the filter_value.
   */
  protected abstract valueMatches(filterValue: any, contentValue: any): boolean;
}

/**
 * In-Memory VectorStore that supports list-based metadata.
 * This In-Memory store simulates VectorStores like AstraDB and OpenSearch.
 */
export class InMemory extends InMemoryBase {
  protected valueMatches(filterValue: any, contentValue: any): boolean {
    return (
      filterValue === contentValue ||
      (Array.isArray(contentValue) && contentValue.includes(filterValue))
    );
  }
}
