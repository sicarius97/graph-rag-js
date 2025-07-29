/**
 * Infers the appropriate adapter for a given vector store.
 */

import { Adapter, Content } from '@graphrag-js/graph-retriever';
import { VectorStore } from '@langchain/core/vectorstores';

const ADAPTERS_PKG = "./";

interface AdapterMapping {
  [key: string]: {
    moduleName: string;
    className: string;
    vectorStores: string[];
  };
}

const ADAPTER_MAPPING: AdapterMapping = {
  "chroma": {
    moduleName: "chroma",
    className: "ChromaAdapter",
    vectorStores: ["Chroma"]
  },
  "cassandra": {
    moduleName: "cassandra",
    className: "CassandraAdapter", 
    vectorStores: ["CassandraStore"]
  },
  "astra": {
    moduleName: "astra",
    className: "AstraDBAdapter",
    vectorStores: ["AstraDBVectorStore"]
  },
  "langchain": {
    moduleName: "langchain",
    className: "LangchainAdapter",
    vectorStores: ["MemoryVectorStore", "HNSWLib", "Pinecone", "Weaviate", "Qdrant", "Milvus"]
  },
  "opensearch": {
    moduleName: "open-search",
    className: "OpenSearchAdapter",
    vectorStores: ["OpenSearchVectorStore"]
  },
  "in-memory": {
    moduleName: "in-memory",
    className: "InMemoryAdapter",
    vectorStores: ["MemoryVectorStore"]
  }
};

function getVectorStoreType(store: VectorStore): string {
  const constructorName = store.constructor.name;
  return constructorName;
}

function findAdapterForStore(storeType: string): string | null {
  for (const [key, config] of Object.entries(ADAPTER_MAPPING)) {
    if (config.vectorStores.includes(storeType)) {
      return key;
    }
  }
  return null;
}

async function loadAdapter(moduleName: string, className: string, store: VectorStore): Promise<Adapter> {
  try {
    const module = await import(`${ADAPTERS_PKG}${moduleName}.js`);
    const AdapterClass = module[className];
    if (!AdapterClass) {
      throw new Error(`Class ${className} not found in module ${moduleName}`);
    }
    return new AdapterClass(store);
  } catch (error) {
    throw new Error(`Failed to load adapter ${className} from ${moduleName}: ${error}`);
  }
}

/**
 * Attempts to infer the appropriate adapter for a given vector store.
 * 
 * @param store - The vector store to create an adapter for
 * @returns An adapter instance compatible with the provided store
 * @throws Error if no suitable adapter can be found or loaded
 */
export async function inferAdapter(store: VectorStore | Adapter): Promise<Adapter> {
  // If it's already an adapter, return it
  if (isAdapter(store)) {
    return store;
  }

  const storeType = getVectorStoreType(store);
  const adapterKey = findAdapterForStore(storeType);
  
  if (!adapterKey) {
    console.warn(`No specific adapter found for ${storeType}, using basic adapter`);
    // Fall back to a basic adapter implementation
    return new BasicVectorStoreAdapter(store) as any;
  }

  const config = ADAPTER_MAPPING[adapterKey];
  try {
    return await loadAdapter(config.moduleName, config.className, store);
  } catch (error) {
    console.warn(`Failed to load specific adapter for ${storeType}, falling back to basic adapter:`, error);
    // Fall back to basic adapter if specific adapter fails to load
    return new BasicVectorStoreAdapter(store) as any;
  }
}

/**
 * Basic adapter implementation for vector stores.
 */
class BasicVectorStoreAdapter {
  constructor(private vectorStore: VectorStore) {}

  async searchWithEmbedding(
    query: string,
    options?: {
      k?: number;
      filter?: Record<string, any>;
      [key: string]: any;
    }
  ): Promise<{ queryEmbedding: number[]; contents: Content[] }> {
    const { k = 4, filter, ...kwargs } = options || {};
    
    if (!this.vectorStore.embeddings) {
      throw new Error("Vector store missing embeddings");
    }
    
    const queryEmbedding = await this.vectorStore.embeddings.embedQuery(query);
    const results = await this.vectorStore.similaritySearchVectorWithScore(queryEmbedding, k, filter);
    
    const contents = results.map(([doc, score]) => ({
      id: doc.id || `doc_${Math.random().toString(36).substr(2, 9)}`,
      content: doc.pageContent,
      embedding: queryEmbedding,
      metadata: { ...doc.metadata, _score: score },
      mimeType: "text/plain",
    }));
    
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
    
    const results = await this.vectorStore.similaritySearchVectorWithScore(embedding, k, filter);
    
    return results.map(([doc, score]) => ({
      id: doc.id || `doc_${Math.random().toString(36).substr(2, 9)}`,
      content: doc.pageContent,
      embedding: embedding,
      metadata: { ...doc.metadata, _score: score },
      mimeType: "text/plain",
    }));
  }

  async get(
    ids: string[],
    options?: {
      filter?: Record<string, any>;
      [key: string]: any;
    }
  ): Promise<Content[]> {
    console.warn("Direct ID lookup not supported by this vector store adapter");
    return [];
  }

  async adjacent(
    edges: Set<any>,
    queryEmbedding: number[],
    options?: {
      k?: number;
      filter?: Record<string, any>;
      [key: string]: any;
    }
  ): Promise<Content[]> {
    // Basic implementation - delegate to search method
    return this.search(queryEmbedding, options);
  }
}

function isAdapter(store: any): store is Adapter {
  return store && typeof store.searchWithEmbedding === 'function';
}
