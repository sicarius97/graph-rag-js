/**
 * Provides an adapter for AstraDB vector store integration.
 */

import { Document } from '@langchain/core/documents';
import { ShreddedLangchainAdapter } from './langchain.js';
import { ShreddingTransformer } from '../transformers/index.js';

interface AstraDBVectorStore {
  embeddings?: any;
  similaritySearchVectorWithScore(
    query: number[],
    k: number,
    filter?: any
  ): Promise<[Document, number][]>;
  addDocuments(documents: Document[]): Promise<void>;
  [key: string]: any;
}

/**
 * Adapter for AstraDB vector store.
 */
export class AstraAdapter extends ShreddedLangchainAdapter<AstraDBVectorStore> {
  constructor(
    vectorStore: AstraDBVectorStore,
    shredder?: ShreddingTransformer
  ) {
    super(vectorStore, shredder);
  }

  protected async _search(
    embedding: number[],
    k: number = 4,
    filter?: Record<string, any>
  ): Promise<Document[]> {
    const results = await this.vectorStore.similaritySearchVectorWithScore(
      embedding,
      k,
      filter
    );

    return results.map(([doc, score]) => new Document({
      id: doc.id,
      pageContent: doc.pageContent,
      metadata: { ...doc.metadata, score },
    }));
  }

  protected async _get(ids: string[]): Promise<Document[]> {
    // Placeholder implementation
    return [];
  }

  protected async _insert(docs: Document[]): Promise<void> {
    await this.vectorStore.addDocuments(docs);
  }
}
