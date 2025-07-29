/**
 * Run a function in a worker or thread pool (if available).
 * In JavaScript/Node.js, this is typically handled by the event loop,
 * so we'll just run it asynchronously with setTimeout for non-blocking behavior.
 * 
 * @param executor - Not used in JavaScript (kept for API compatibility)
 * @param func - The function to run
 * @param args - Arguments to pass to the function
 * @returns Promise that resolves to the function result
 */
export async function runInExecutor<T extends any[], R>(
  executor: any | null,
  func: (...args: T) => R,
  ...args: T
): Promise<R> {
  try {
    // In a browser/Node.js environment, we don't have true threading,
    // but we can use setTimeout to yield control to the event loop
    return await new Promise<R>((resolve, reject) => {
      setTimeout(() => {
        try {
          const result = func(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, 0);
    });
  } catch (error) {
    // Convert any iteration-related errors to runtime errors
    if (error instanceof Error && error.message.includes('iteration')) {
      throw new Error(`Runtime error: ${error.message}`);
    }
    throw error;
  }
}
