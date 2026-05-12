export function extractBvid(url: string): string | null {
  const match = url.match(/\/video\/(BV\w+)/);
  return match ? match[1] : null;
}

export function extractMediaId(url: string): string | null {
  const favMatch = url.match(/\/medialist\/detail\/(\d+)/);
  if (favMatch) return favMatch[1];
  const collectionMatch = url.match(/\/collections\/detail\/(\d+)/);
  return collectionMatch ? collectionMatch[1] : null;
}
