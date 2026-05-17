import 'dotenv/config';
import express from 'express';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import crypto from 'crypto';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-in-production';
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://album:album@localhost:5432/album',
});

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
  const { rows } = await pool.query('SELECT owned, repeats FROM stickers WHERE user_id = $1', [req.user.id]);
  res.json({ owned: rows[0]?.owned ?? [], repeats: rows[0]?.repeats ?? {} });
});

app.put('/api/stickers', auth, async (req, res) => {
  const { owned, repeats } = req.body ?? {};
  if (!Array.isArray(owned)) return res.status(400).json({ error: 'Formato inválido' });
  if (typeof repeats !== 'object' || Array.isArray(repeats) || repeats === null)
    return res.status(400).json({ error: 'Formato inválido' });
  await pool.query(
    `INSERT INTO stickers (user_id, owned, repeats) VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET owned = $2, repeats = $3, updated_at = NOW()`,
    [req.user.id, JSON.stringify(owned), JSON.stringify(repeats)]
  );
  res.json({ ok: true });
});

// Generate shareable link for repeated stickers
app.post('/api/share/repeats', auth, async (req, res) => {
  try {
    // Get current repeats
    const { rows } = await pool.query('SELECT repeats FROM stickers WHERE user_id = $1', [req.user.id]);
    const repeats = rows[0]?.repeats ?? {};
    
    // Filter out only repeats with count > 0
    const validRepeats = Object.entries(repeats)
      .filter(([, count]) => count > 0)
      .reduce((acc, [id, count]) => ({ ...acc, [id]: count }), {});
    
    if (Object.keys(validRepeats).length === 0) {
      return res.status(400).json({ error: 'No tenés estampas repetidas para compartir' });
    }
    
    // Generate unique ID
    const shareId = crypto.randomBytes(8).toString('hex');
    
    // Set expiration to 30 days from now
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    // Store in database
    await pool.query(
      `INSERT INTO shared_links (id, user_id, username, repeats, expires_at) 
       VALUES ($1, $2, $3, $4, $5)`,
      [shareId, req.user.id, req.user.username, JSON.stringify(validRepeats), expiresAt]
    );
    
    res.json({ shareId, expiresAt });
  } catch (e) {
    console.error('Error creating share link:', e);
    res.status(500).json({ error: 'Error al crear el link para compartir' });
  }
});

// Generate shareable link for missing stickers
app.post('/api/share/missing', auth, async (req, res) => {
  try {
    const { missing } = req.body ?? {};
    if (!Array.isArray(missing) || missing.length === 0) {
      return res.status(400).json({ error: 'No tenés estampas faltantes para compartir' });
    }

    const shareId = crypto.randomBytes(8).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO shared_links (id, user_id, username, type, repeats, missing, expires_at)
       VALUES ($1, $2, $3, 'missing', '{}', $4, $5)`,
      [shareId, req.user.id, req.user.username, JSON.stringify(missing), expiresAt]
    );

    res.json({ shareId, expiresAt });
  } catch (e) {
    console.error('Error creating missing share link:', e);
    res.status(500).json({ error: 'Error al crear el link para compartir' });
  }
});

// Get shared stickers (public endpoint, no auth required)
app.get('/api/share/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;

    const { rows } = await pool.query(
      `SELECT username, type, repeats, missing, created_at, expires_at
       FROM shared_links
       WHERE id = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
      [shareId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Link no encontrado o expirado' });
    }

    const { username, type, repeats, missing, created_at, expires_at } = rows[0];

    res.json({
      username,
      type: type || 'repeats',
      repeats,
      missing,
      createdAt: created_at,
      expiresAt: expires_at
    });
  } catch (e) {
    console.error('Error fetching shared link:', e);
    res.status(500).json({ error: 'Error al obtener el link compartido' });
  }
});

app.use((req, res) => {
  const indexPath = join(distPath, 'index.html');
  if (existsSync(indexPath)) res.sendFile(indexPath);
  else res.status(404).send('Frontend not built. Run: npm run build in root folder.');
});

app.listen(PORT, () => console.log(`Album Mundial running on http://localhost:${PORT}`));
