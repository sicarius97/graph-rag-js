/**
 * Merge async iterables into a single async iterator.
 * Elements are yielded in the order they become available.
 */

interface Done {
  exception: boolean;
}

export async function* amerge<T>(
  ...asyncIterables: AsyncIterable<T>[]
): AsyncGenerator<T> {
  const queueSize = 10; // Default queue size
  const queue: (T | Done)[] = [];
  let pendingCount = asyncIterables.length;
  
  if (pendingCount === 0) {
    return;
  }

  // Create promises for each async iterable
  const pumps = asyncIterables.map(async (aiter) => {
    try {
      for await (const item of aiter) {
        queue.push(item);
      }
      queue.push({ exception: false });
    } catch (error) {
      queue.push({ exception: true });
      throw error;
    }
  });

  // Start all pumps
  const tasks = pumps.map(pump => pump.catch(() => {})); // Catch to prevent unhandled rejection
  
  try {
    while (pendingCount > 0) {
      // Wait for at least one item to be available
      while (queue.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      const item = queue.shift()!;
      
      if (isDone(item)) {
        if (item.exception) {
          // If there has been an exception, end early
          break;
        } else {
          pendingCount--;
        }
      } else {
        yield item;
      }
    }
  } finally {
    // Wait for all tasks to complete
    await Promise.allSettled(tasks);
  }
}

function isDone<T>(item: T | Done): item is Done {
  return typeof item === 'object' && item !== null && 'exception' in item;
}
