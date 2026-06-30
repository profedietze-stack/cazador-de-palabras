export function lsGet(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

export function lsSet(key: string, val: string): void {
  try { localStorage.setItem(key, val) } catch { /* Safari private / quota */ }
}

export function lsRemove(key: string): void {
  try { localStorage.removeItem(key) } catch { /* Safari private / quota */ }
}
