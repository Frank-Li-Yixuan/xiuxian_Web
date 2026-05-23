export function isBrowserDebugModeEnabled(search: string): boolean {
  const normalized = search.startsWith("?") ? search : `?${search}`;
  return new URLSearchParams(normalized).get("debug") === "1";
}
