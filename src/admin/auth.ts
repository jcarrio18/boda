const TOKEN_KEY = 'boda_admin_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Authenticated fetch against the admin API. Attaches the bearer token and
 * throws on non-2xx responses. On 401 it clears the stored token so the UI
 * can redirect back to the login screen.
 */
export async function apiFetch<T = unknown>(
  input: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(input, { ...init, headers });

  if (res.status === 401) {
    clearToken();
    throw new Error('No autorizado. Vuelve a iniciar sesión.');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && (data.error as string)) || 'Error en la petición';
    throw new Error(message);
  }
  return data as T;
}

/** Validates the given token against the server login endpoint. */
export async function login(token: string): Promise<void> {
  const res = await fetch('/api/admin-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error((data && data.error) || 'Contraseña incorrecta');
  }
  setToken(token);
}
