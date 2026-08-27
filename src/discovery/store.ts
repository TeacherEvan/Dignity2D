/** Discovery / image-reveal persistence.
 *  Per-user cache: localStorage key "dignity2d-discovered" = JSON array of completed UUID ids.
 *  Non-repeat: read manifest; filter out completed ids; pick first undiscovered.
 *  Design: UUID-based (manifest.json); overlay mode via drawBackground().
 */
const CACHE_KEY = "dignity2d-discovered";

export function getDiscoveredIds(): string[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function addDiscovered(id: string): void {
  const set = new Set(getDiscoveredIds());
  if (!set.has(id)) {
    set.add(id);
    localStorage.setItem(CACHE_KEY, JSON.stringify(Array.from(set)));
  }
}

/** Load manifest (assumes served at /discovered-images/manifest.json). */
export async function loadManifest(): Promise<
  Array<{ id: string; filename: string; levelUnlock: string }>
> {
  try {
    const res = await fetch("/discovered-images/manifest.json");
    if (!res.ok) return [];
    const data = await res.json();
    return data.images || [];
  } catch {
    return [];
  }
}

/** Pick the first undiscovered image UUID given completed set. Returns {id, filename} or null. */
export async function pickNextReveal(): Promise<{
  id: string;
  filename: string;
  levelUnlock: string;
} | null> {
  const completed = new Set(getDiscoveredIds());
  const images = await loadManifest();
  for (const img of images) {
    if (!completed.has(img.id)) {
      return img;
    }
  }
  return null;
}
