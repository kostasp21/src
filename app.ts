import express, { Application, Request, Response, NextFunction } from 'express';
import rentalsRouter from './routes/rentals';
import bookingsRouter from './routes/bookings';
import cors from 'cors';

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/rentals', rentalsRouter);
app.use('/api/bookings', bookingsRouter);

// Health check
app.get('/', (req: Request, res: Response) => {
  res.send(' Rentals API is running!');
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Κάτι πήγε στραβά στον server.' });
});

export default app;