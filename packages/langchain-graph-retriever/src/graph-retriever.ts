import { 
  traverse, 
  atraverse, 
  Adapter, 
  EdgeFunction, 
  EdgeSpec, 
  Strategy, 
  Eager 
} from '@sicarius97/graph-retriever';
import { Document } from '@langchain/core/documents';
import { BaseRetriever } from '@langchain/core/retrievers';
import { VectorStore } from '@langchain/core/vectorstores';
import { nodeToDoc } from './conversion.js';
import { inferAdapter } from './adapters/inference.js';

export interface GraphRetrieverConfig {
  store: Adapter | VectorStore;
  edges?: EdgeSpec[] | EdgeFunction;
  strategy?: Strategy;
  [key: string]: any; // For extra configuration
}

export interface RetrievalOptions {
  edges?: EdgeSpec[] | EdgeFunction;
  initialRoots?: string[];
  filter?: Record<string, any>;
  storeKwargs?: Record<string, any>;
  [key: string]: any; // For strategy configuration
}

/**
 * Retriever combining vector search and graph traversal.
 * 
 * The GraphRetriever class retrieves documents by first performing a vector search 
 * to identify relevant documents, followed by graph traversal to explore their connections. 
 * It supports multiple traversal strategies and integrates seamlessly with 
 * LangChain's retriever framework.
 */
export class GraphRetriever extends BaseRetriever {
  lc_namespace = ["langchain", "retrievers", "graph"];
  
  public store: Adapter | VectorStore;
  public edges: EdgeSpec[] | EdgeFunction;
  public strategy: Strategy;
  private _adapter?: Adapter;

  constructor(config: GraphRetrieverConfig) {
    super();
    
    this.store = config.store;
    this.edges = config.edges || [];
    this.strategy = config.strategy || new Eager();

    // Apply extra configuration to the strategy
    const { store, edges, strategy, ...extraConfig } = config;
    if (Object.keys(extraConfig).length > 0) {
      // Convert 'k' to 'selectK' if present
      if ('k' in extraConfig) {
        extraConfig.selectK = extraConfig.k;
        delete extraConfig.k;
      }
      Object.assign(this.strategy, extraConfig);
    }
  }

  /**
   * Get the adapter to use during traversals.
   */
  async getAdapter(): Promise<Adapter> {
    if (!this._adapter) {
      this._adapter = await inferAdapter(this.store);
    }
    return this._adapter;
  }

  /**
   * Retrieve documents using graph traversal and similarity search.
   * 
   * This method first retrieves documents based on similarity to the query, and
   * then applies a traversal strategy to explore connected nodes in the graph.
   */
  async _getRelevantDocuments(
    query: string,
    runManager?: any,
    options: RetrievalOptions = {}
  ): Promise<Document[]> {
    const {
      edges = this.edges,
      initialRoots = [],
      filter,
      storeKwargs = {},
      ...strategyKwargs
    } = options;

    if (!edges || (Array.isArray(edges) && edges.length === 0)) {
      throw new Error("'edges' must be provided in options or constructor");
    }

    const strategy = Strategy.build(this.strategy, strategyKwargs);
    const adapter = await this.getAdapter();

    const nodes = await atraverse(query, {
      edges,
      strategy,
      store: adapter,
      metadataFilter: filter,
      initialRootIds: initialRoots,
      storeKwargs,
    });

    return nodes.map(nodeToDoc);
  }

  /**
   * Synchronous version of document retrieval.
   */
  async getRelevantDocuments(
    query: string,
    options: RetrievalOptions = {}
  ): Promise<Document[]> {
    const {
      edges = this.edges,
      initialRoots = [],
      filter,
      storeKwargs = {},
      ...strategyKwargs
    } = options;

    if (!edges || (Array.isArray(edges) && edges.length === 0)) {
      throw new Error("'edges' must be provided in options or constructor");
    }

    const strategy = Strategy.build(this.strategy, strategyKwargs);
    const adapter = await this.getAdapter();

    const nodes = await traverse(query, {
      edges,
      strategy,
      store: adapter,
      metadataFilter: filter,
      initialRootIds: initialRoots,
      storeKwargs,
    });

    return nodes.map(nodeToDoc);
  }
}
