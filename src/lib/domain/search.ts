/**
 * True if every character of `query` appears in `target`, in order, but not
 * necessarily consecutively — a fuzzy-finder-style subsequence match (e.g.
 * "grcry" matches "Groceries"), not a substring/prefix match. Case-
 * insensitive. An empty query matches everything.
 */
export function isSubsequenceMatch(query: string, target: string): boolean {
  if (!query) return true;

  const q = query.toLowerCase();
  const t = target.toLowerCase();

  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}
