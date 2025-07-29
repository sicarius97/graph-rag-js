/**
 * Batches an iterable into chunks of a specified size.
 * Equivalent to Python's itertools.batched (available in Python 3.12+).
 * 
 * @param iterable - Iterator over elements
 * @param n - Size of batches
 * @yields Yields arrays of elements in successive batches
 * @throws ValueError if n is less than 1
 */
export function* batched<T>(iterable: Iterable<T>, n: number): Generator<T[]> {
  if (n < 1) {
    throw new Error('n must be at least one');
  }

  const iterator = iterable[Symbol.iterator]();
  let batch: T[] = [];
  let result = iterator.next();

  while (!result.done) {
    batch.push(result.value);
    
    if (batch.length === n) {
      yield batch;
      batch = [];
    }
    
    result = iterator.next();
  }

  // Yield the remaining items if any
  if (batch.length > 0) {
    yield batch;
  }
}
