import * as graphRag from '@graphrag-js/graph-retriever';

console.log('Full import:', Object.keys(graphRag));
console.log('Adapter:', graphRag.Adapter);
console.log('typeof Adapter:', typeof graphRag.Adapter);

// Now test the direct import
import { Adapter } from '@graphrag-js/graph-retriever';

console.log('Direct import Adapter:', Adapter);
console.log('typeof direct Adapter:', typeof Adapter);
