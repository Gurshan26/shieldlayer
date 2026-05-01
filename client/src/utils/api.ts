function resolveApiBase(): string {
  const configured = import.meta.env.VITE_API_URL;
  if (configured && configured.trim()) {
    return configured.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    return `${protocol}//${hostname}:3001`;
  }

  return 'http://localhost:3001';
}

const API_BASE = resolveApiBase();

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export async function api<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
  } catch {
    throw new Error(`Can't reach API at ${API_BASE}. Start the server on :3001 or set VITE_API_URL.`);
  }

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status})`);
  }

  return data as T;
}
