/** Stable partition: incomplete items first, completed items last, each
 * group keeping its original relative order (whatever tie-break the caller
 * already had — creation order, due date, etc.) instead of inventing a new one. */
export function sortIncompleteFirst<T>(
  items: T[],
  isCompleted: (item: T) => boolean,
): T[] {
  return items
    .map((item, index) => ({ item, index, completed: isCompleted(item) }))
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.index - b.index;
    })
    .map((entry) => entry.item);
}
