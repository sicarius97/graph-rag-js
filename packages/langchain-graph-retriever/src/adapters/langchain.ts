/**
 * Defines the base class for vector store adapters.
 */

import { Content, Adapter } from '@graph-rag-js/graph-retriever';
import { Document } from '@langchain/core/documents';
import { Embeddings } from '@langchain/core/embeddings';
import { VectorStore } from '@langchain/core/vectorstores';
import { docToContent } from '../conversion.js';
import { ShreddingTransformer } from '../transformers/index.js';

interface VectorStoreInterface {
  embeddings?: any;
  [key: string]: any;
}

/**
 * Base adapter for integrating vector stores with the graph retriever system.
 * 
 * This class provides a foundation for custom adapters, enabling consistent
 * interaction with various vector store implementations.
 */
export abstract class LangchainAdapter<T extends VectorStoreInterface = any> extends Adapter {
  protected vectorStore: T;

  constructor(vectorStore: T) {
    super();
    this.vectorStore = vectorStore;
  }

  protected get safeEmbedding(): Embeddings {
    if (!this.vectorStore.embeddings) {
      throw new Error("Missing embedding");
    }
    // Use embeddings directly as the VectorStore embeddings are compatible
    return this.vectorStore.embeddings as any;
  }

  async embedQuery(query: string): Promise<number[]> {
    return await this.safeEmbedding.embedQuery(query);
  }

  /**
   * Update the metadata filter before executing the query.
   */
  updateFilterHook(filter: Record<string, any> | null): Record<string, any> | null {
    return filter;
  }

  /**
   * Format the documents as content after executing the query.
   */
  formatDocumentsHook(docs: Document[]): Content[] {
    return docs.map(doc => docToContent(doc));
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
    const queryEmbedding = await this.embedQuery(query);
    const docs = await this._search(queryEmbedding, k, filter, kwargs);
    const contents = this.formatDocumentsHook(docs);
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
    const { k = 4, filter, ...kwargs } = options || {};
    const docs = await this._search(embedding, k, filter, kwargs);
    return this.formatDocumentsHook(docs);
  }

  async get(
    ids: string[],
    options?: {
      filter?: Record<string, any>;
      [key: string]: any;
    }
  ): Promise<Content[]> {
    const { filter, ...kwargs } = options || {};
    const docs = await this._get(ids, filter, kwargs);
    return this.formatDocumentsHook(docs);
  }

  async insert(contents: Content[], ...kwargs: any[]): Promise<void> {
    const docs = contents.map(content => new Document({
      id: content.id,
      pageContent: content.content,
      metadata: content.metadata,
    }));
    await this._insert(docs, { ...kwargs });
  }

  /**
   * Abstract methods to be implemented by concrete adapters
   */
  protected abstract _search(
    embedding: number[],
    k: number,
    filter?: Record<string, any>,
    kwargs?: Record<string, any>
  ): Promise<Document[]>;

  protected abstract _get(
    ids: string[],
    filter?: Record<string, any>,
    kwargs?: Record<string, any>
  ): Promise<Document[]>;

  protected abstract _insert(
    docs: Document[],
    kwargs?: Record<string, any>
  ): Promise<void>;
}

/**
 * Base adapter that includes document shredding capabilities.
 */
export abstract class ShreddedLangchainAdapter<T extends VectorStoreInterface = any> extends LangchainAdapter<T> {
  protected shredder: ShreddingTransformer;

  constructor(vectorStore: T, shredder?: ShreddingTransformer) {
    super(vectorStore);
    this.shredder = shredder || new ShreddingTransformer();
  }

  async insert(contents: Content[], ...kwargs: any[]): Promise<void> {
    const docs = contents.map(content => new Document({
      id: content.id,
      pageContent: content.content,
      metadata: content.metadata,
    }));
    
    const shreddedDocs = await this.shredder.transform(docs);
    await this._insert(shreddedDocs, { ...kwargs });
  }
}
