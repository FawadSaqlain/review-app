function getStoredToken() {
  return localStorage.getItem('adminToken') || localStorage.getItem('token') || null;
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});

  if (!headers.has('Accept')) headers.set('Accept', 'application/json');

  const token = getStoredToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', 'Bearer ' + token);
  }

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: 'same-origin'
  });

  let json = null;
  try {
    json = await res.json();
  } catch (e) {
    json = null;
  }

  if (!res.ok) {
    const msg = (json && json.error && json.error.message) || (json && json.message) || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = json;
    throw err;
  }

  return json;
}
