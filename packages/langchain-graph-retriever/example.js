/**
 * Simple example demonstrating the graph retriever integration
 */

const { GraphRetriever } = require('./dist/index.js');
const { InMemory, Eager, createContent } = require('../graph-retriever/dist/index.js');

// Simple embedding function for demonstration
function embedText(text) {
    // Simple hash-based embedding for demo
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    // Normalize and create a simple 3D vector
    const normalized = Math.abs(hash) / Math.pow(2, 31);
    return [normalized, normalized * 0.5, normalized * 0.3];
}

async function main() {
    console.log('Setting up graph retriever example...');

    // Create some sample content
    const contents = [
        createContent({
            id: 'doc1',
            content: 'JavaScript is a programming language',
            embedding: embedText('JavaScript is a programming language'),
            metadata: { category: 'programming', language: 'javascript' }
        }),
        createContent({
            id: 'doc2',
            content: 'Python is also a programming language',
            embedding: embedText('Python is also a programming language'),
            metadata: { category: 'programming', language: 'python' }
        }),
        createContent({
            id: 'doc3',
            content: 'Machine learning uses algorithms',
            embedding: embedText('Machine learning uses algorithms'),
            metadata: { category: 'ai', topic: 'ml' }
        })
    ];

    // Create in-memory adapter
    const adapter = new InMemory(embedText, contents);

    // Create the graph retriever with simple edges
    const retriever = new GraphRetriever({
        store: adapter,
        edges: [['category', 'category']], // Connect documents with same category
        strategy: new Eager({ selectK: 5 })
    });

    // Test a search
    console.log('Performing search...');
    const results = await retriever._getRelevantDocuments('programming languages');

    console.log(`Found ${results.length} results:`);
    results.forEach((doc, i) => {
        console.log(`${i + 1}. ID: ${doc.id}`);
        console.log(`   Content: ${doc.pageContent}`);
        console.log(`   Metadata:`, doc.metadata);
        console.log('');
    });

    console.log('Graph retriever integration working successfully!');
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };
