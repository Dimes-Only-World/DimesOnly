// Attaches the signed session tokens to every call to our backend functions,
// so the server can verify who is calling instead of trusting IDs in the body.
const FUNCTIONS_PATH = "/functions/v1/";

function readToken(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function withEdgeAuth(input: RequestInfo | URL, init?: RequestInit): [RequestInfo | URL, RequestInit | undefined] {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!url || !url.includes(FUNCTIONS_PATH) || !url.includes(".supabase.co")) return [input, init];
  const userToken = readToken("dimesPushAuthToken");
  const adminToken = readToken("adminToken");
  if (!userToken && !adminToken) return [input, init];
  const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
  if (userToken && !headers.has("x-user-token")) headers.set("x-user-token", userToken);
  if (adminToken && !headers.has("x-admin-token")) headers.set("x-admin-token", adminToken);
  return [input, { ...(init || {}), headers }];
}

let installed = false;
export function installEdgeAuthFetch() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const [i, n] = withEdgeAuth(input, init);
    return original(i, n);
  }) as typeof window.fetch;
}

installEdgeAuthFetch();
