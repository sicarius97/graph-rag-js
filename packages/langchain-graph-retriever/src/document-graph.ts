/**
 * Utilities for creating and analyzing a graph of documents.
 */

import { Document } from '@langchain/core/documents';
import { 
  Content, 
  Edge, 
  EdgeFunction, 
  EdgeSpec, 
  MetadataEdgeFunction 
} from '@graph-rag-js/graph-retriever';

// Using a simplified graph implementation since networkx-js might not have all features
interface GraphNode {
  id: string;
  doc: Document;
}

interface GraphEdge {
  source: string;
  target: string;
}

export interface DirectedGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  
  addNode(id: string, data: GraphNode): void;
  addEdge(source: string, target: string): void;
  getNode(id: string): GraphNode | undefined;
  getNodes(): GraphNode[];
  getEdges(): GraphEdge[];
  numberOfEdges(): number;
}

class SimpleDirectedGraph implements DirectedGraph {
  public nodes = new Map<string, GraphNode>();
  public edges: GraphEdge[] = [];

  addNode(id: string, data: GraphNode): void {
    this.nodes.set(id, data);
  }

  addEdge(source: string, target: string): void {
    this.edges.push({ source, target });
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  getNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  getEdges(): GraphEdge[] {
    return this.edges;
  }

  numberOfEdges(): number {
    return this.edges.length;
  }
}

/**
 * Compute the best communities in a directed graph.
 * 
 * This is a simplified implementation since we don't have the full networkx
 * Girvan-Newman algorithm. This creates basic communities based on connected components.
 */
function bestCommunities(graph: DirectedGraph): string[][] {
  const visited = new Set<string>();
  const communities: string[][] = [];

  for (const node of graph.getNodes()) {
    if (!visited.has(node.id)) {
      const community = [node.id];
      visited.add(node.id);
      
      // Find all nodes connected to this one (simplified approach)
      const toVisit = [node.id];
      while (toVisit.length > 0) {
        const current = toVisit.pop()!;
        
        // Find all edges from or to this node
        for (const edge of graph.getEdges()) {
          let connected: string | null = null;
          if (edge.source === current && !visited.has(edge.target)) {
            connected = edge.target;
          } else if (edge.target === current && !visited.has(edge.source)) {
            connected = edge.source;
          }
          
          if (connected) {
            visited.add(connected);
            community.push(connected);
            toVisit.push(connected);
          }
        }
      }
      
      communities.push(community);
    }
  }

  return communities;
}

/**
 * Create a directed graph from a sequence of documents.
 * 
 * This function constructs a directed graph where each document is a node, and
 * edges are defined based on relationships in the document metadata.
 */
export function createGraph(
  documents: Document[],
  edges: EdgeSpec[] | EdgeFunction
): DirectedGraph {
  const graph = new SimpleDirectedGraph();

  let edgeFunction: EdgeFunction;
  if (Array.isArray(edges)) {
    const metadataEdgeFunction = new MetadataEdgeFunction(edges);
    edgeFunction = (content: Content) => metadataEdgeFunction.call(content);
  } else if (typeof edges === 'function') {
    edgeFunction = edges;
  } else {
    throw new Error(`Expected EdgeSpec[] or EdgeFunction but got: ${edges}`);
  }

  // First pass -- index documents based on "to_fields" so we can navigate to them.
  const documentsByIncoming = new Map<string, Set<string>>();
  const outgoingById = new Map<string, Set<Edge>>();

  for (const document of documents) {
    if (!document.id) {
      throw new Error("Document must have an id");
    }

    graph.addNode(document.id, { id: document.id, doc: document });

    const documentEdges = edgeFunction({
      id: document.id,
      content: document.pageContent,
      embedding: [], // Empty since we only need metadata for edge creation
      metadata: document.metadata,
      mimeType: "text/plain",
    });

    for (const incoming of documentEdges.incoming) {
      const key = JSON.stringify(incoming); // Simple serialization for edge key
      if (!documentsByIncoming.has(key)) {
        documentsByIncoming.set(key, new Set());
      }
      documentsByIncoming.get(key)!.add(document.id);
    }
    
    outgoingById.set(document.id, new Set(documentEdges.outgoing));
  }

  // Second pass -- add edges for each outgoing edge.
  for (const [id, outgoing] of outgoingById) {
    const linkedTo = new Set<string>();
    
    for (const out of outgoing) {
      const key = JSON.stringify(out);
      const targets = documentsByIncoming.get(key);
      if (targets) {
        for (const target of targets) {
          linkedTo.add(target);
        }
      }
    }
    
    for (const target of linkedTo) {
      if (target !== id) {
        graph.addEdge(id, target);
      }
    }
  }

  return graph;
}

/**
 * Group documents by community inferred from the graph's structure.
 * 
 * This function partitions the graph into communities and groups documents 
 * based on their community memberships.
 */
export function groupByCommunity(graph: DirectedGraph): Document[][] {
  const communities = bestCommunities(graph);
  return communities.map(community => 
    community.map(nodeId => {
      const node = graph.getNode(nodeId);
      if (!node) {
        throw new Error(`Node ${nodeId} not found in graph`);
      }
      return node.doc;
    })
  );
}
