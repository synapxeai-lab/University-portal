const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Access token stored in memory — sessionStorage used for tab-level persistence
let _token = null;
export const getToken = () => _token;
export const setToken = (t) => { _token = t; };

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Request failed with status ${res.status}`);
  return data;
}

export const api = {
  get:    (path)        => request(path, { method: 'GET' }),
  post:   (path, body)  => request(path, { method: 'POST',  body: JSON.stringify(body) }),
  put:    (path, body)  => request(path, { method: 'PUT',   body: JSON.stringify(body) }),
  delete: (path, body)  => request(path, { method: 'DELETE', ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }),
};
