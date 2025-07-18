import express from 'express';
import cors from 'cors';
import carsRouter from './routes/cars';
import { setupSwagger } from './swagger';
import authRoutes from './routes/auth.routes';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes); 
app.use('/api/cars', carsRouter);

app.listen(PORT, () => {
  console.log(` Server running at http://localhost:${PORT}`);
});