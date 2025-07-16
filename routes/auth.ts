import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const router = Router();

const users = [
  { id: 1, email: 'admin@example.com', password: '123456' },
];

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