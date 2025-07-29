# LangChain Graph Retriever

LangChain Graph Retriever is a TypeScript/JavaScript library that supports traversing a document graph on top of vector-based similarity search.
It works seamlessly with LangChain's retriever framework and supports various graph traversal strategies for efficient document discovery.

> **Note**: This is a TypeScript/JavaScript port of the original Python `langchain-graph-retriever` library. All Python dependencies have been replaced with their JavaScript equivalents, and imports from `graph-retriever` now use `@graphrag-js/graph-retriever`.

## Features

- **Vector Search**: Perform similarity searches using vector embeddings.
- **Graph Traversal**: Apply traversal strategies such as breadth-first (Eager) or Maximal Marginal Relevance (MMR) to explore document relationships.
- **Customizable Strategies**: Easily extend and configure traversal strategies to meet your specific use case.
- **Multiple Adapters**: Support for various vector stores, including AstraDB, Cassandra, Chroma, OpenSearch, and in-memory storage.
- **Synchronous and Asynchronous Retrieval**: Supports both sync and async workflows for flexibility in different applications.
- **TypeScript Support**: Full TypeScript support with comprehensive type definitions.

## Installation

Install the library via npm:

```bash
npm install @graphrag-js/langchain-graph-retriever
```

## Dependencies

This library depends on:
- `@graphrag-js/graph-retriever` - Core graph retrieval functionality
- `@langchain/core` - LangChain core components for document handling and retrievers

## Getting Started

Here is an example of how to use LangChain Graph Retriever:

```typescript
import { GraphRetriever } from '@graphrag-js/langchain-graph-retriever';
import { Chroma } from '@langchain/community/vectorstores/chroma';

// Initialize the vector store (Chroma in this example)
const vectorStore = new Chroma({
  embeddings: yourEmbeddingFunction,
});

// Create the Graph Retriever
const retriever = new GraphRetriever({
  store: vectorStore,
  // Define edges based on document metadata
  edges: [["keywords", "keywords"]],
});

// Perform a retrieval
const documents = await retriever.invoke("What is the capital of France?");

// Print the results
for (const doc of documents) {
  console.log(doc.pageContent);
}
```

## Configuration

The `GraphRetriever` accepts the following configuration options:

```typescript
interface GraphRetrieverConfig {
  store: Adapter | VectorStore;        // Vector store or adapter instance
  edges?: EdgeSpec[] | EdgeFunction;   // Edge definitions for graph traversal
  strategy?: Strategy;                 // Traversal strategy (default: Eager)
  [key: string]: any;                  // Additional strategy configuration
}
```

### Edge Specifications

Define how documents are connected in the graph:

```typescript
// Connect documents with matching metadata fields
const edges = [
  ["category", "category"],      // Same category
  ["tags", "tags"],             // Shared tags  
  ["author", "author"]          // Same author
];
```

### Retrieval Options

Control retrieval behavior with additional options:

```typescript
const documents = await retriever._getRelevantDocuments("query", runManager, {
  edges: [["topic", "topic"]],     // Override default edges
  initialRoots: ["doc1", "doc2"],  // Start from specific documents
  filter: { category: "science" }, // Apply metadata filters
  k: 5                             // Number of documents to retrieve
});
```

## Document Graph Utilities

Create and analyze document graphs:

```typescript
import { createGraph, groupByCommunity } from '@graphrag-js/langchain-graph-retriever';

// Create a graph from documents
const graph = createGraph(documents, edges);

// Group documents by detected communities
const communities = groupByCommunity(graph);
```

## Adapters

The library includes adapters for popular vector stores:

- **ChromaAdapter** - For Chroma vector stores
- **InMemoryAdapter** - For in-memory vector stores  
- **AstraAdapter** - For AstraDB vector stores
- **CassandraAdapter** - For Cassandra vector stores
- **OpenSearchAdapter** - For OpenSearch vector stores

Adapters are automatically inferred based on the vector store type.

## Transformers

Document transformers for preprocessing:

```typescript
import { ShreddingTransformer, HtmlTransformer, ParentTransformer } from '@graphrag-js/langchain-graph-retriever';

// Shred documents into chunks
const shredder = new ShreddingTransformer({
  chunkSize: 1000,
  chunkOverlap: 200
});

// Clean HTML content
const htmlTransformer = new HtmlTransformer({
  removeHtmlTags: true,
  extractMetadata: true
});

// Maintain parent-child relationships
const parentTransformer = new ParentTransformer({
  parentIdField: 'parent_id',
  preserveHierarchy: true
});
```

## Migration from Python

If you're migrating from the Python version:

1. **Import Changes**: Replace `from langchain_graph_retriever import ...` with `import { ... } from '@graphrag-js/langchain-graph-retriever'`
2. **Graph Retriever**: Replace `from graph_retriever import ...` with `import { ... } from '@graphrag-js/graph-retriever'`
3. **Syntax**: Convert Python syntax to TypeScript/JavaScript (async/await, type annotations, etc.)
4. **Configuration**: Object properties now use camelCase (e.g., `initial_roots` → `initialRoots`)

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run linting
npm run lint

# Format code
npm run format
```

## License

This project is licensed under the Apache 2 License. See the LICENSE file for more details.
