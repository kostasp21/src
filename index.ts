import express from 'express';
import cors from 'cors';
import carsRouter from './routes/cars';
import rentalsRouter from './routes/rentals';
import bookingsRouter from './routes/bookings';
import { setupSwagger } from './swagger';
import authRoutes from './routes/auth.routes';
import { pool } from './db'; 

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ✅ LOGGING για debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.use('/api/auth', authRoutes); 
app.use('/api/cars', carsRouter);
app.use('/api/rentals', rentalsRouter);
app.use('/api/bookings', bookingsRouter);

// ✅ HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    routes: ['auth', 'cars', 'rentals', 'bookings'],
    database: 'postgres connected'
  });
});

// ✅ SIMPLE connectDB function
const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    
    // Test query
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database test:', result.rows[0]);
    
    client.release();
    return pool;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

// ✅ START SERVER WITH DATABASE
const startServer = async () => {
  try {
    // Connect to database first
    await connectDB();
    console.log('✅ PostgreSQL database connected successfully');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      console.log('✅ Database: PostgreSQL (localhost:5432/postgres)');
      console.log('Available routes:');
      console.log('- /api/auth');
      console.log('- /api/cars');
      console.log('- /api/rentals');
      console.log('- /api/bookings ');
      console.log('- /api/health');
    });
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    console.log('⚠️ Starting server without database...');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT} (NO DATABASE)`);
    });
  }
};

startServer();