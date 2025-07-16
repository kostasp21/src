import express from 'express';
import cors from 'cors';
import carsRouter from './routes/cars';
import { setupSwagger } from './swagger';

const app = express();

app.use(cors({
  origin: 'http://localhost:4200', 
  credentials: true
}));

app.use(express.json());

app.use('/cars', carsRouter);

setupSwagger(app);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;