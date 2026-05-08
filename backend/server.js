import 'dotenv/config';
import express from 'express';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-production';
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://album:album@localhost:5432/album',
});

await pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS stickers (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    owned JSONB NOT NULL DEFAULT '[]',
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
`);

const app = express();
app.use(express.json({ limit: '1mb' }));

const distPath = join(__dirname, 'public');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
}

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body ?? {};
  if (!username?.trim() || !email?.trim() || !password)
    return res.status(400).json({ error: 'Usuario, correo y contraseña requeridos' });
  if (username.trim().length < 3)
    return res.status(400).json({ error: 'Usuario muy corto (mín. 3 caracteres)' });
  if (!EMAIL_RE.test(email.trim()))
    return res.status(400).json({ error: 'Correo electrónico inválido' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Contraseña muy corta (mín. 6 caracteres)' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES (LOWER($1), LOWER($2), $3) RETURNING id, username',
      [username.trim(), email.trim(), hash]
    );
    const token = jwt.sign({ id: rows[0].id, username: rows[0].username }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, username: rows[0].username });
  } catch (e) {
    if (e.code === '23505') {
      const field = e.constraint?.includes('email') ? 'correo electrónico' : 'nombre de usuario';
      return res.status(409).json({ error: `Ese ${field} ya está registrado` });
    }
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password)
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  const { rows } = await pool.query('SELECT * FROM users WHERE username = LOWER($1)', [username.trim()]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, username: user.username });
});

app.get('/api/stickers', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT owned FROM stickers WHERE user_id = $1', [req.user.id]);
  res.json({ owned: rows[0]?.owned ?? [] });
});

app.put('/api/stickers', auth, async (req, res) => {
  const { owned } = req.body ?? {};
  if (!Array.isArray(owned)) return res.status(400).json({ error: 'Formato inválido' });
  await pool.query(
    `INSERT INTO stickers (user_id, owned) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET owned = $2, updated_at = NOW()`,
    [req.user.id, JSON.stringify(owned)]
  );
  res.json({ ok: true });
});

app.use((req, res) => {
  const indexPath = join(distPath, 'index.html');
  if (existsSync(indexPath)) res.sendFile(indexPath);
  else res.status(404).send('Frontend not built. Run: npm run build in root folder.');
});

app.listen(PORT, () => console.log(`Album Mundial running on http://localhost:${PORT}`));
