import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/db.js';
import { authenticateToken, JWT_SECRET } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        author_id: user.author_id,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    let authorData = null;
    if (user.author_id) {
      const [authorRows] = await db.query('SELECT * FROM authors WHERE author_id = ?', [user.author_id]);
      authorData = authorRows[0] || null;
    }

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        author_id: user.author_id,
        name: user.name,
        author: authorData
      }
    });
  } catch (err) {
    console.error('[Auth Error]', err);
    res.status(500).json({ error: 'Authentication service error.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, email, role, author_id, name, created_at FROM users WHERE id = ?', [req.user.id]);
    const user = rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    let author = null;
    if (user.author_id) {
      const [authorRows] = await db.query('SELECT * FROM authors WHERE author_id = ?', [user.author_id]);
      author = authorRows[0] || null;
    }

    res.json({ user: { ...user, author } });
  } catch (err) {
    console.error('[Auth Me Error]', err);
    res.status(500).json({ error: 'User lookup error.' });
  }
});

// GET /api/auth/demo-accounts
// Provides quick demo accounts for hiring managers & evaluators
router.get('/demo-accounts', async (req, res) => {
  try {
    const [admins] = await db.query("SELECT email, name, role FROM users WHERE role = 'admin'");
    const [authors] = await db.query(`
      SELECT u.email, u.name, u.role, u.author_id, a.city,
        (SELECT COUNT(*) FROM books b WHERE b.author_id = u.author_id) as book_count
      FROM users u
      JOIN authors a ON u.author_id = a.author_id
      WHERE u.role = 'author'
      ORDER BY u.author_id ASC
    `);

    res.json({
      admins,
      authors,
      default_passwords: {
        admin: 'admin123',
        author: 'author123'
      }
    });
  } catch (err) {
    console.error('[Demo Accounts Error]', err);
    res.status(500).json({ error: 'Failed to load demo accounts.' });
  }
});

export default router;
