/**
 * Provides an adapter for Chroma vector store integration.
 */

import { Document } from '@langchain/core/documents';
import { ShreddedLangchainAdapter } from './langchain.js';
import { METADATA_EMBEDDING_KEY } from '../conversion.js';
import { ShreddingTransformer } from '../transformers/index.js';

// Type for Chroma - this would normally come from @langchain/community
interface ChromaVectorStore {
  embeddings?: any;
  similaritySearchVectorWithScore(
    query: number[],
    k: number,
    filter?: any
  ): Promise<[Document, number][]>;
  addDocuments(documents: Document[]): Promise<void>;
  delete(options: { ids: string[] }): Promise<void>;
  [key: string]: any;
}

/**
 * Adapter for Chroma vector store.
 * 
 * This adapter integrates the LangChain Chroma vector store with the
 * graph retriever system, allowing for similarity search and document retrieval.
 */
export class ChromaAdapter extends ShreddedLangchainAdapter<ChromaVectorStore> {
  constructor(
    vectorStore: ChromaVectorStore,
    shredder?: ShreddingTransformer
  ) {
    super(vectorStore, shredder);
  }

  updateFilterHook(filter: Record<string, any> | null): Record<string, any> | null {
    const updatedFilter = super.updateFilterHook(filter);
    if (!updatedFilter || Object.keys(updatedFilter).length <= 1) {
      return updatedFilter;
    }

    const conjoined = Object.entries(updatedFilter).map(([k, v]) => ({ [k]: v }));
    return { $and: conjoined };
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
    ...kwargs: any[]
  ): Promise<Document[]> {
    // This is a simplified implementation - actual Chroma might have a different API
    const docs: Document[] = [];
    
    for (const id of ids) {
      try {
        // This would need to be implemented based on the actual Chroma API
        // For now, this is a placeholder
        const doc = await this.vectorStore.getDocumentById?.(id);
        if (doc) {
          docs.push(doc);
        }
      } catch (error) {
        // Continue if document not found
        console.warn(`Document ${id} not found:`, error);
      }
    }

    return docs;
  }

  protected async _insert(docs: Document[], ...kwargs: any[]): Promise<void> {
    await this.vectorStore.addDocuments(docs);
  }
}
