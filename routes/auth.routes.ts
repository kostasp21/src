import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db';

const router = Router();

// LOGIN
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND password = $2',
      [email, password]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Μη έγκυρα στοιχεία εισόδου' });
    }
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, 'SECRET_KEY', { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Σφάλμα σύνδεσης' });
  }
});

// REGISTER
router.post('/register', async (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  if (!email || !password || !username) {
    return res.status(400).json({ error: 'Λείπουν πεδία εγγραφής' });
  }
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Ο χρήστης υπάρχει ήδη' });
    }
    await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3)',
      [username, email, password]
    );
    return res.status(201).json({ message: 'Ο χρήστης δημιουργήθηκε' });
  } catch (err) {
    console.error('Register error:', err); 
    res.status(500).json({ error: 'Σφάλμα εγγραφής' });
  }
});

export default router;