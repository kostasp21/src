import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { pool } from '../db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'SECRET_KEY';

// LOGIN - Ενημερωμένο
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    console.log(' Login attempt for:', email);

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email και password είναι υποχρεωτικά' });
    }

    // Find user με όλα τα στοιχεία και role
    const result = await pool.query(
      'SELECT id, username, email, password, role FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      console.log(' User not found:', email);
      return res.status(401).json({ error: 'Λάθος email ή password' });
    }

    const user = result.rows[0];
    console.log(' Found user:', { id: user.id, username: user.username, email: user.email, role: user.role });

    
    let isValid = false;
    
    // Ελέγξε αν είναι hashed password ή plain text
    if (user.password.startsWith('$2b$')) {
      // Hashed password
      isValid = await bcrypt.compare(password, user.password);
    } else {
      // Plain text password (για backward compatibility)
      isValid = password === user.password;
      
      // Αν είναι σωστό, hash το password για την επόμενη φορά
      if (isValid) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, user.id]);
        console.log(' Password hashed for user:', user.email);
      }
    }

    if (!isValid) {
      console.log(' Invalid password for:', email);
      return res.status(401).json({ error: 'Λάθος email ή password' });
    }

    // Generate JWT με role
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log(' Login successful for:', email, 'Role:', user.role);

    // Return token AND user data
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role || 'user' // Default σε 'user' αν δεν υπάρχει role
      }
    });
  } catch (error) {
    console.error(' Login error:', error);
    res.status(500).json({ error: 'Σφάλμα διακομιστή' });
  }
});

// REGISTER - Ενημερωμένο με hashing
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    
    console.log(' Registration attempt for:', email);

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Λείπουν πεδία εγγραφής' });
    }

    // Check if user exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Ο χρήστης υπάρχει ήδη' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user με default role 'user'
    const result = await pool.query(
      'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
      [username, email, hashedPassword, 'user']
    );

    const newUser = result.rows[0];

    // Generate JWT
    const token = jwt.sign(
      { userId: newUser.id, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log(' User registered successfully:', email);

    // Return token AND user data
    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (err) {
    console.error(' Register error:', err); 
    res.status(500).json({ error: 'Σφάλμα εγγραφής' });
  }
});

// GET /users - Λήψη όλων των χρηστών (για admin)
router.get('/users', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    
    res.json({
      success: true,
      users: result.rows
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Σφάλμα διακομιστή' });
  }
});

export default router;