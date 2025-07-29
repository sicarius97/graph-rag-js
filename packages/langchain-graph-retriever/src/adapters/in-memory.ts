/**
 * Provides an adapter for in-memory vector store integration.
 */

import { Document } from '@langchain/core/documents';
import { LangchainAdapter } from './langchain';
import { METADATA_EMBEDDING_KEY } from '../conversion';

// Type for MemoryVectorStore - this would normally come from @langchain/core
interface MemoryVectorStore {
  embeddings?: any;
  similaritySearchVectorWithScore(
    query: number[],
    k: number,
    filter?: any
  ): Promise<[Document, number][]>;
  addDocuments(documents: Document[]): Promise<void>;
  memoryVectors: Array<{
    content: string;
    embedding: number[];
    metadata: Record<string, any>;
    id?: string;
  }>;
  [key: string]: any;
}

/**
 * Adapter for in-memory vector store.
 * 
 * This adapter integrates the LangChain MemoryVectorStore with the
 * graph retriever system, allowing for similarity search and document retrieval.
 */
export class InMemoryAdapter extends LangchainAdapter<MemoryVectorStore> {
  constructor(vectorStore: MemoryVectorStore) {
    super(vectorStore);
  }

  protected async _search(
    embedding: number[],
    k: number = 4,
    filter?: Record<string, any>,
    kwargs?: Record<string, any>
  ): Promise<Document[]> {
    if (k === 0) {
      return [];
    }

    const results = await this.vectorStore.similaritySearchVectorWithScore(
      embedding,
      k,
      filter
    );

    return results.map(([doc, score]) => new Document({
      id: doc.id,
      pageContent: doc.pageContent,
      metadata: {
        ...doc.metadata,
        [METADATA_EMBEDDING_KEY]: embedding,
        score,
      },
    }));
  }

  protected async _get(
    ids: string[],
    filter?: Record<string, any>,
    kwargs?: Record<string, any>
  ): Promise<Document[]> {
    const docs: Document[] = [];
    
    for (const vector of this.vectorStore.memoryVectors) {
      if (vector.id && ids.includes(vector.id)) {
        // Apply filter if provided
        if (filter) {
          const matchesFilter = Object.entries(filter).every(([key, value]) => {
            return vector.metadata[key] === value;
          });
          if (!matchesFilter) continue;
        }

        docs.push(new Document({
          id: vector.id,
          pageContent: vector.content,
          metadata: {
            ...vector.metadata,
            [METADATA_EMBEDDING_KEY]: vector.embedding,
          },
        }));
      }
    }

    return docs;
  }

  protected async _insert(docs: Document[], kwargs?: Record<string, any>): Promise<void> {
    await this.vectorStore.addDocuments(docs);
  }
}
