import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import express from 'express';

const router = Router();

const users = [
  { id: 1, email: 'admin@example.com', password: '123456' },
];

router.post('/register', (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  if (!email || !password || !username) {
    return res.status(400).json({ error: 'Λείπουν πεδία εγγραφής' });
  }

  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(409).json({ error: 'Ο χρήστης υπάρχει ήδη' });
  }

  const newUser = {
    id: users.length + 1,
    username,
    email,
    password,
  };

  users.push(newUser);

  return res.status(201).json({ message: 'Ο χρήστης δημιουργήθηκε' });
});


router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ error: 'Μη έγκυρα στοιχεία εισόδου' });
  }

  const token = jwt.sign({ userId: user.id }, 'SECRET_KEY', { expiresIn: '1h' });

  res.json({ token });
});

export default router;