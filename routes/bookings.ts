import express, { Request, Response } from 'express';
import { pool } from '../db';

const router = express.Router();

console.log(' Bookings routes loading with database (NO AUTH)...');

//  Auto-create simplified table
const createBookingsTable = async () => {
  try {
    const client = await pool.connect();
    
    console.log(' Creating simplified bookings table...');
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS simple_bookings (
        booking_id SERIAL PRIMARY KEY,
        car_id INTEGER NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255),
        customer_phone VARCHAR(50),
        notes TEXT,
        status VARCHAR(50) DEFAULT 'confirmed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await client.query(createTableQuery);
    console.log(' simple_bookings table ready');
    
    client.release();
    return true;
  } catch (error) {
    console.error(' Error creating table:', error);
    return false;
  }
};

//  GET BOOKINGS
router.get('/', (req, res) => {
  console.log(' GET /api/bookings called');
  res.json({
    success: true,
    message: 'Bookings endpoint is working',
    bookings: [],
    database: 'connected'
  });
});

//  POST BOOKING - NO USER_ID
router.post('/', async (req: Request, res: Response) => {
  try {
    //  Ensure table exists
    await createBookingsTable();
    
    console.log(' POST /api/bookings called (NO USER_ID)');
    console.log('- Request body:', req.body);
    
    const {
      car_id,
      start_date,
      end_date,
      total_price,
      customer_name,
      customer_email,
      customer_phone,
      notes
    } = req.body;

    // Basic validation
    if (!car_id || !start_date || !end_date || !total_price || !customer_name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: ['car_id', 'start_date', 'end_date', 'total_price', 'customer_name']
      });
    }

    console.log(' All required fields present, checking car...');

    // Check car availability
    const carCheck = await pool.query('SELECT quantity, brand, model FROM cars WHERE car_id = $1', [car_id]);
    
    if (carCheck.rows.length === 0) {
      console.log(' Car not found:', car_id);
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    const currentQuantity = carCheck.rows[0].quantity;
    const carInfo = carCheck.rows[0];
    console.log(` Car: ${carInfo.brand} ${carInfo.model}, Quantity: ${currentQuantity}`);
    
    if (currentQuantity <= 0) {
      console.log(' Car not available');
      return res.status(400).json({
        success: false,
        message: 'Car not available for booking'
      });
    }

    // Database transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      console.log(' Starting transaction...');

      //  Create booking WITHOUT user_id
      const bookingResult = await client.query(`
        INSERT INTO simple_bookings (
          car_id, start_date, end_date, total_price, 
          customer_name, customer_email, customer_phone, notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'confirmed')
        RETURNING *
      `, [car_id, start_date, end_date, total_price, customer_name, customer_email, customer_phone, notes]);

      const booking = bookingResult.rows[0];
      console.log(' Booking created:', booking.booking_id);

      //  Update car quantity χωρίς updated_at reference
      const updateResult = await client.query(`
        UPDATE cars 
        SET quantity = quantity - 1
        WHERE car_id = $1 AND quantity > 0
        RETURNING quantity, brand, model
      `, [car_id]);

      if (updateResult.rows.length === 0) {
        console.log(' Failed to update car quantity');
        throw new Error('Failed to update car availability');
      }

      const newQuantity = updateResult.rows[0].quantity;
      console.log(` Car quantity updated: ${currentQuantity} → ${newQuantity}`);

      await client.query('COMMIT');
      console.log(' Transaction committed');

      res.status(201).json({
        success: true,
        data: booking,
        booking: booking,
        car_quantity: newQuantity,
        message: `Booking created successfully! ${newQuantity} cars remaining.`
      });

    } catch (transactionError: any) {
      await client.query('ROLLBACK');
      console.error(' Transaction failed:', transactionError);
      throw transactionError;
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error(' Error creating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating booking',
      error: error.message
    });
  }
});

//  GET ALL BOOKINGS 
router.get('/all', async (req: Request, res: Response) => {
  try {
    await createBookingsTable();
    
    console.log(' GET /api/bookings/all called');
    
    const result = await pool.query(`
      SELECT 
        b.*,
        c.brand,
        c.model,
        c.price_per_day,
        c.image_url
      FROM simple_bookings b
      JOIN cars c ON b.car_id = c.car_id
      ORDER BY b.created_at DESC
    `);

    console.log(' Found', result.rows.length, 'bookings');

    res.json({
      success: true,
      bookings: result.rows,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error: any) {
    console.error(' Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
      error: error.message
    });
  }
});

//  Get bookings by customer email/phone
router.get('/user/:identifier', async (req: Request, res: Response) => {
  try {
    await createBookingsTable();
    
    const { identifier } = req.params; // email ή phone
    console.log(' GET /api/bookings/user for identifier:', identifier);
    
    const result = await pool.query(`
      SELECT 
        b.*,
        c.brand,
        c.model,
        c.price_per_day,
        c.image_url
      FROM simple_bookings b
      JOIN cars c ON b.car_id = c.car_id
      WHERE b.customer_email = $1 OR b.customer_phone = $1
      ORDER BY b.created_at DESC
    `, [identifier]);

    console.log(` Found ${result.rows.length} bookings for user: ${identifier}`);

    res.json({
      success: true,
      bookings: result.rows,
      data: result.rows,
      count: result.rows.length,
      user_identifier: identifier
    });
  } catch (error: any) {
    console.error('❌ Error fetching user bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user bookings',
      error: error.message
    });
  }
});

// � UPDATE BOOKING BY ID
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const bookingId = parseInt(req.params.id);
    
    if (!bookingId || isNaN(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }
    
    console.log(`📝 PUT /api/bookings/${bookingId} called`);
    console.log('- Request body:', req.body);
    
    const {
      customer_name,
      customer_email,
      customer_phone,
      start_date,
      end_date,
      status,
      notes,
      total_price
    } = req.body;
    
    await createBookingsTable();
    const client = await pool.connect();
    
    // First check if booking exists
    const checkQuery = 'SELECT * FROM simple_bookings WHERE booking_id = $1';
    const checkResult = await client.query(checkQuery, [bookingId]);
    
    if (checkResult.rows.length === 0) {
      client.release();
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Build dynamic update query based on provided fields
    const updateFields = [];
    const updateValues = [];
    let valueIndex = 1;
    
    if (customer_name !== undefined) {
      updateFields.push(`customer_name = $${valueIndex++}`);
      updateValues.push(customer_name);
    }
    if (customer_email !== undefined) {
      updateFields.push(`customer_email = $${valueIndex++}`);
      updateValues.push(customer_email);
    }
    if (customer_phone !== undefined) {
      updateFields.push(`customer_phone = $${valueIndex++}`);
      updateValues.push(customer_phone);
    }
    if (start_date !== undefined) {
      updateFields.push(`start_date = $${valueIndex++}`);
      updateValues.push(start_date);
    }
    if (end_date !== undefined) {
      updateFields.push(`end_date = $${valueIndex++}`);
      updateValues.push(end_date);
    }
    if (status !== undefined) {
      updateFields.push(`status = $${valueIndex++}`);
      updateValues.push(status);
    }
    if (notes !== undefined) {
      updateFields.push(`notes = $${valueIndex++}`);
      updateValues.push(notes);
    }
    if (total_price !== undefined) {
      updateFields.push(`total_price = $${valueIndex++}`);
      updateValues.push(total_price);
    }
    
    if (updateFields.length === 0) {
      client.release();
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }
    
    // Add booking_id to the end for WHERE clause
    updateValues.push(bookingId);
    
    const updateQuery = `
      UPDATE simple_bookings 
      SET ${updateFields.join(', ')}
      WHERE booking_id = $${valueIndex}
      RETURNING *
    `;
    
    console.log('📝 Update query:', updateQuery);
    console.log('📝 Update values:', updateValues);
    
    const updateResult = await client.query(updateQuery, updateValues);
    const updatedBooking = updateResult.rows[0];
    
    client.release();
    
    console.log(`✅ Booking ${bookingId} updated successfully`);
    
    res.json({
      success: true,
      message: 'Booking updated successfully',
      booking: updatedBooking
    });
    
  } catch (error) {
    console.error('❌ Error updating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating booking',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// �🗑️ DELETE BOOKING BY ID
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const bookingId = parseInt(req.params.id);
    
    if (!bookingId || isNaN(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }
    
    console.log(`🗑️ DELETE /api/bookings/${bookingId} called`);
    
    await createBookingsTable();
    const client = await pool.connect();
    
    // First check if booking exists
    const checkQuery = 'SELECT * FROM simple_bookings WHERE booking_id = $1';
    const checkResult = await client.query(checkQuery, [bookingId]);
    
    if (checkResult.rows.length === 0) {
      client.release();
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    const booking = checkResult.rows[0];
    
    // Delete the booking
    const deleteQuery = 'DELETE FROM simple_bookings WHERE booking_id = $1';
    await client.query(deleteQuery, [bookingId]);
    
    // Restore car quantity if needed
    if (booking.car_id) {
      const updateCarQuery = `
        UPDATE cars 
        SET quantity = quantity + 1 
        WHERE car_id = $1
      `;
      await client.query(updateCarQuery, [booking.car_id]);
      console.log(`🚗 Restored quantity for car ${booking.car_id}`);
    }
    
    client.release();
    
    console.log(`✅ Booking ${bookingId} deleted successfully`);
    
    res.json({
      success: true,
      message: 'Booking deleted successfully',
      booking_id: bookingId
    });
    
  } catch (error) {
    console.error('❌ Error deleting booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting booking',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

console.log(' Bookings routes loaded - CLEAN VERSION');

export default router;