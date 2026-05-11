const getToken = () => localStorage.getItem('am_token');
export const setToken = (t) => localStorage.setItem('am_token', t);
export const clearToken = () => localStorage.removeItem('am_token');
export const getUsername = () => localStorage.getItem('am_user');
export const setUsername = (u) => localStorage.setItem('am_user', u);
export const clearUsername = () => localStorage.removeItem('am_user');

const req = async (path, options = {}) => {
  const token = getToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
};

export const login = (username, password) =>
  req('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });

export const register = (username, email, password) =>
  req('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password }) });

export const fetchStickers = () => req('/api/stickers');

export const saveStickers = (owned, repeats) =>
  req('/api/stickers', { method: 'PUT', body: JSON.stringify({ owned, repeats }) });

export const createShareLink = () =>
  req('/api/share/repeats', { method: 'POST' });

export const getSharedRepeats = async (shareId) => {
  const res = await fetch(`/api/share/${shareId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
};
