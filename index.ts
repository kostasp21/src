import express from 'express';
import cors from 'cors';
import carsRouter from './routes/cars';
import rentalsRouter from './routes/rentals'; // Προσθήκη του rentals router
import { setupSwagger } from './swagger';
import authRoutes from './routes/auth.routes';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes); 
app.use('/api/cars', carsRouter);
app.use('/api/rentals', rentalsRouter); // Προσθήκη αυτής της γραμμής

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});