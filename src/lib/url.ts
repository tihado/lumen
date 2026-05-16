/**
 * Basic guard for SSRF / javascript: URLs before persisting or fetching.
 */
export function isSafeHttpsUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") {
      return false;
    }
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
