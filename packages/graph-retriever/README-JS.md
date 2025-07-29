# Graph Retrievers (JavaScript/TypeScript)

This is a JavaScript/TypeScript port of the Python graph-retriever package. It provides retrievers that combine vector similarity search over unstructured data with structured graph relationships.

## Features

- **Content Management**: Create and manage content with embeddings and metadata
- **Vector Store Adapters**: Base adapter interface with in-memory implementation
- **Graph Traversal**: Traverse documents using metadata relationships and vector similarity  
- **Flexible Strategies**: Multiple traversal strategies (eager, scored, etc.)
- **Edge Functions**: Define relationships between documents through metadata
- **TypeScript Support**: Full TypeScript support with type definitions

## Installation

```bash
npm install @graphrag-js/graph-retriever
```

## Basic Usage

```typescript
import { createContent, InMemory, Eager, traverse } from '@graphrag-js/graph-retriever';

// Create some content
const contents = [
  createContent({
    id: 'doc1',
    content: 'Hello world',
    embedding: [1, 0, 0],
    metadata: { category: 'greeting' }
  }),
  createContent({
    id: 'doc2', 
    content: 'Goodbye world',
    embedding: [0, 1, 0],
    metadata: { category: 'farewell' }
  })
];

// Set up adapter and strategy
const embedFunction = (text: string) => [0.5, 0.5, 0]; // Your embedding function
const adapter = new InMemory(embedFunction, contents);
const strategy = new Eager({ selectK: 5 });

// Perform traversal
const nodes = await traverse('search query', {
  edges: [['category', 'category']], // Define relationships
  strategy,
  store: adapter
});

console.log(nodes); // Retrieved nodes
```

## Architecture

The package is organized into several key modules:

- **Content**: Data structures for documents with embeddings
- **Adapters**: Interfaces for vector stores (base class + in-memory implementation)
- **Edges**: Define relationships between documents 
- **Strategies**: Control traversal behavior (eager, scored, etc.)
- **Traversal**: Main graph traversal logic
- **Utils**: Utility functions for math, batching, etc.

## Conversion from Python

This package is a direct port of the Python graph-retriever. Key differences:

- Async-first API (JavaScript is naturally async)
- TypeScript interfaces instead of dataclasses
- JavaScript Map/Set instead of Python dict/set
- Promise-based instead of asyncio
- Simplified heap implementation for scored strategy

## License

Apache-2.0
