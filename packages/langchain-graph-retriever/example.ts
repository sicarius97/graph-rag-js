/**
 * Example usage of the LangChain Graph Retriever
 */

import { GraphRetriever } from './src/index.js';

// Mock implementations for demonstration
class MockDocument {
  constructor(public data: any) {
    this.id = data.id;
    this.pageContent = data.pageContent;
    this.metadata = data.metadata || {};
  }
  
  id: string;
  pageContent: string;
  metadata: Record<string, any>;
}

class MockEmbeddings {
  async embedQuery(query: string): Promise<number[]> {
    // Simple mock embedding based on query length and content
    return Array.from({ length: 384 }, (_, i) => 
      Math.sin(query.length + i) * 0.1
    );
  }
}

class MockVectorStore {
  private documents: MockDocument[] = [];
  
  constructor(public embeddings: MockEmbeddings) {}

  async addDocuments(docs: MockDocument[]): Promise<void> {
    this.documents.push(...docs);
  }

  async similaritySearchVectorWithScore(
    embedding: number[],
    k: number,
    filter?: any
  ): Promise<[MockDocument, number][]> {
    // Simple mock similarity based on metadata matching
    let filteredDocs = this.documents;
    
    if (filter) {
      filteredDocs = this.documents.filter(doc => {
        return Object.entries(filter).every(([key, value]) => 
          doc.metadata[key] === value
        );
      });
    }

    return filteredDocs
      .slice(0, k)
      .map(doc => [doc, Math.random()]);
  }
}

async function example() {
  console.log('LangChain Graph Retriever Example');
  console.log('==================================');

  // Create mock documents
  const documents = [
    new MockDocument({
      id: 'doc1',
      pageContent: 'Paris is the capital of France and a major European city.',
      metadata: { 
        category: 'geography',
        country: 'France',
        keywords: ['Paris', 'France', 'capital', 'Europe']
      }
    }),
    new MockDocument({
      id: 'doc2', 
      pageContent: 'The Eiffel Tower is located in Paris, France.',
      metadata: {
        category: 'landmarks',
        country: 'France', 
        keywords: ['Eiffel Tower', 'Paris', 'landmark']
      }
    }),
    new MockDocument({
      id: 'doc3',
      pageContent: 'French cuisine is renowned worldwide for its sophistication.',
      metadata: {
        category: 'culture',
        country: 'France',
        keywords: ['French', 'cuisine', 'food', 'culture']
      }
    }),
    new MockDocument({
      id: 'doc4',
      pageContent: 'London is the capital of the United Kingdom.',
      metadata: {
        category: 'geography', 
        country: 'UK',
        keywords: ['London', 'UK', 'capital']
      }
    })
  ];

  // Initialize the vector store
  const embeddings = new MockEmbeddings();
  const vectorStore = new MockVectorStore(embeddings);
  await vectorStore.addDocuments(documents);

  // Create the Graph Retriever
  const retriever = new GraphRetriever({
    store: vectorStore,
    // Define edges based on shared countries and categories
    edges: [
      ['country', 'country'],  // Connect docs from same country
      ['category', 'category'] // Connect docs in same category
    ],
    k: 3 // Retrieve top 3 similar documents
  });

  console.log('\n1. Basic Retrieval');
  console.log('-------------------');
  
  try {
    const query = "What is the capital of France?";
    console.log(`Query: "${query}"`);
    
    const results = await retriever._getRelevantDocuments(query);
    console.log(`Found ${results.length} relevant documents:`);
    
    results.forEach((doc, index) => {
      console.log(`\n${index + 1}. Document ID: ${doc.id}`);
      console.log(`   Content: ${doc.pageContent}`);
      console.log(`   Category: ${doc.metadata.category}`);
      console.log(`   Country: ${doc.metadata.country}`);
    });

  } catch (error) {
    console.error('Error during retrieval:', error);
  }

  console.log('\n2. Filtered Retrieval');
  console.log('----------------------');
  
  try {
    const query = "Tell me about landmarks";
    console.log(`Query: "${query}"`);
    
    const results = await retriever._getRelevantDocuments(query, undefined, {
      filter: { country: 'France' }
    });
    
    console.log(`Found ${results.length} relevant documents in France:`);
    
    results.forEach((doc, index) => {
      console.log(`\n${index + 1}. Document ID: ${doc.id}`);
      console.log(`   Content: ${doc.pageContent}`);
      console.log(`   Keywords: ${doc.metadata.keywords?.join(', ')}`);
    });

  } catch (error) {
    console.error('Error during filtered retrieval:', error);
  }

  console.log('\n3. Using Initial Roots');
  console.log('-----------------------');
  
  try {
    const query = "European cities";
    console.log(`Query: "${query}"`);
    
    const results = await retriever._getRelevantDocuments(query, undefined, {
      initialRoots: ['doc1'] // Start traversal from Paris document
    });
    
    console.log(`Found ${results.length} relevant documents starting from doc1:`);
    
    results.forEach((doc, index) => {
      console.log(`\n${index + 1}. Document ID: ${doc.id}`);
      console.log(`   Content: ${doc.pageContent.substring(0, 50)}...`);
      console.log(`   Category: ${doc.metadata.category}`);
    });

  } catch (error) {
    console.error('Error during root-based retrieval:', error);
  }

  console.log('\nExample completed!');
}

// Run the example if this file is executed directly
if (require.main === module) {
  example().catch(console.error);
}

export { example };
