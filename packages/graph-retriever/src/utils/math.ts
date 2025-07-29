/**
 * Math utility functions for vector operations.
 */

type Matrix = number[][] | number[];

/**
 * Compute the dot product of two vectors.
 */
function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

/**
 * Compute the magnitude (norm) of a vector.
 */
function magnitude(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
}

/**
 * Compute row-wise cosine similarity between two equal-width matrices.
 * 
 * @param X - A matrix of shape (m, n), where m is the number of rows and n is the number of columns
 * @param Y - A matrix of shape (p, n), where p is the number of rows and n is the number of columns
 * @returns A matrix of shape (m, p) containing the cosine similarity scores
 */
export function cosineSimilarity(X: Matrix, Y: Matrix): number[][] {
  // Handle empty inputs
  if (!Array.isArray(X) || !Array.isArray(Y) || X.length === 0 || Y.length === 0) {
    return [];
  }

  // Normalize input to 2D arrays
  const matrixX = Array.isArray(X[0]) ? X as number[][] : [X as number[]];
  const matrixY = Array.isArray(Y[0]) ? Y as number[][] : [Y as number[]];

  // Check dimensions
  if (matrixX[0].length !== matrixY[0].length) {
    throw new Error(
      `Number of columns in X and Y must be the same. X has shape [${matrixX.length}, ${matrixX[0].length}] ` +
      `and Y has shape [${matrixY.length}, ${matrixY[0].length}].`
    );
  }

  const result: number[][] = [];

  for (let i = 0; i < matrixX.length; i++) {
    const row: number[] = [];
    const xVector = matrixX[i];
    const xMagnitude = magnitude(xVector);

    for (let j = 0; j < matrixY.length; j++) {
      const yVector = matrixY[j];
      const yMagnitude = magnitude(yVector);

      // Handle divide by zero
      if (xMagnitude === 0 || yMagnitude === 0) {
        row.push(0.0);
      } else {
        const dot = dotProduct(xVector, yVector);
        const similarity = dot / (xMagnitude * yMagnitude);
        // Handle NaN or Infinity
        row.push(isNaN(similarity) || !isFinite(similarity) ? 0.0 : similarity);
      }
    }
    result.push(row);
  }

  return result;
}

/**
 * Row-wise cosine similarity with optional top-k and score threshold filtering.
 * 
 * @param X - A matrix of shape (m, n)
 * @param Y - A matrix of shape (p, n)
 * @param topK - Max number of results to return
 * @param scoreThreshold - Minimum score to return
 * @returns Two-tuples of indices and corresponding cosine similarities
 */
export function cosineSimilarityTopK(
  X: Matrix,
  Y: Matrix,
  topK?: number,
  scoreThreshold?: number
): { indices: [number, number][]; scores: number[] } {
  if (!Array.isArray(X) || !Array.isArray(Y) || X.length === 0 || Y.length === 0) {
    return { indices: [], scores: [] };
  }

  const scoreMatrix = cosineSimilarity(X, Y);
  const threshold = scoreThreshold ?? -1.0;
  
  // Flatten scores with indices
  const flattenedScores: { score: number; xIdx: number; yIdx: number }[] = [];
  
  for (let i = 0; i < scoreMatrix.length; i++) {
    for (let j = 0; j < scoreMatrix[i].length; j++) {
      const score = scoreMatrix[i][j];
      if (score >= threshold) {
        flattenedScores.push({ score, xIdx: i, yIdx: j });
      }
    }
  }

  // Sort by score descending
  flattenedScores.sort((a, b) => b.score - a.score);

  // Apply top-k limit
  const limit = Math.min(topK ?? flattenedScores.length, flattenedScores.length);
  const topResults = flattenedScores.slice(0, limit);

  return {
    indices: topResults.map(r => [r.xIdx, r.yIdx] as [number, number]),
    scores: topResults.map(r => r.score),
  };
}
