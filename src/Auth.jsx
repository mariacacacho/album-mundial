import { useState } from 'react';
import { login, register, setToken, setUsername } from './api.js';

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [username, setUser] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = mode === 'login'
        ? await login(username.trim(), password)
        : await register(username.trim(), email.trim(), password);
      setToken(data.token);
      setUsername(data.username);
      onAuth(data.username);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
  };

  return (
    <div style={s.root}>
      <div style={s.card}>
        <div style={s.trophy}>🏆</div>
        <h1 style={s.title}>Álbum Mundial</h1>
        <p style={s.subtitle}>{mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}</p>

        <form onSubmit={submit} style={s.form}>
          <input
            style={s.input}
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUser(e.target.value)}
            autoComplete="username"
            required
          />
          {mode === 'register' && (
            <input
              style={s.input}
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          )}
          <input
            style={s.input}
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPass(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
          />
          {error && <p style={s.error}>{error}</p>}
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Cargando…' : mode === 'login' ? 'Entrar' : 'Registrarse'}
          </button>
        </form>

        <button style={s.toggle} onClick={switchMode}>
          {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </div>
    </div>
  );
}

const s = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
    padding: 16,
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  card: {
    width: '100%',
    maxWidth: 360,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: '36px 28px',
    textAlign: 'center',
  },
  trophy: { fontSize: 48, lineHeight: 1, marginBottom: 8 },
  title: {
    margin: '0 0 4px',
    fontSize: '1.8rem',
    fontWeight: 800,
    background: 'linear-gradient(90deg, #a5b4fc, #f0abfc)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: { margin: '0 0 24px', color: '#94a3b8', fontSize: 14 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: {
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.06)',
    color: '#e2e8f0',
    fontSize: 15,
    outline: 'none',
    fontFamily: 'inherit',
  },
  btn: {
    padding: 13,
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
    color: '#fff',
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  error: { margin: 0, color: '#f87171', fontSize: 13 },
  toggle: {
    marginTop: 16,
    background: 'none',
    border: 'none',
    color: '#a5b4fc',
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: 'inherit',
  },
};
