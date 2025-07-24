import { Router, Request, Response } from 'express';
import {pool} from '../db';
import { validateBody } from '../middleware/validate';
import { rentalSchema } from '../validation/rentalSchema';
import { NextFunction } from 'express';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Rentals
 *   description: Διαχείριση ενοικιάσεων
 */

// GET όλα τα rentals
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM rentals ORDER BY rental_id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching rentals:', err);
    res.status(500).json({ error: 'Σφάλμα κατά την ανάκτηση των ενοικιάσεων' });
  }
});

// GET μία ενοικίαση
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM rentals WHERE rental_id = $1', [id]);
    if (result.rows.length === 0) {
      const error = new Error('Δεν βρέθηκε η ενοικίαση') as any;
      error.statusCode = 404;
      return next(error);
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST νέα ενοικίαση - ενημερωμένο για νέα πεδία
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const { 
    car_id, 
    customer_name, 
    customer_phone, 
    customer_address, 
    city, 
    postal_code, 
    start_date,  
    end_date,   
    days,        
    total_price 
  } = req.body;

  console.log('📝 Creating rental with data:', req.body);

  // Validation
  if (!car_id || !customer_name || !customer_phone || !start_date || !end_date) {
    return res.status(400).json({ error: 'Όλα τα απαιτούμενα πεδία πρέπει να συμπληρωθούν' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO rentals (
        car_id, customer_name, customer_phone, customer_address, 
        city, postal_code, start_date, end_date, days, total_price
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [car_id, customer_name, customer_phone, customer_address, city, postal_code, start_date, end_date, days, total_price]
    );

    console.log('✅ Rental created:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('❌ Error creating rental:', err);
    const error = new Error('Σφάλμα κατά την εισαγωγή της ενοικίασης') as any;
    error.statusCode = 500;
    next(error);
  }
});

// PUT ενημέρωση ενοικίασης - ενημερωμένο
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { 
    car_id, 
    customer_name, 
    customer_phone, 
    customer_address, 
    city, 
    postal_code, 
    start_date,  
    end_date,    
    days,        
    total_price 
  } = req.body;

  console.log('📝 Updating rental with data:', req.body);

  try {
    const result = await pool.query(
      `UPDATE rentals SET
        car_id = $1,
        customer_name = $2,
        customer_phone = $3,
        customer_address = $4,
        city = $5,
        postal_code = $6,
        start_date = $7,
        end_date = $8,
        days = $9,
        total_price = $10
       WHERE rental_id = $11
       RETURNING *`,
      [car_id, customer_name, customer_phone, customer_address, city, postal_code, start_date, end_date, days, total_price, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Δεν βρέθηκε η ενοικίαση για ενημέρωση' });
    }

    console.log('✅ Rental updated:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error updating rental:', err);
    res.status(500).json({ error: 'Σφάλμα κατά την ενημέρωση της ενοικίασης' });
  }
});

// DELETE ενοικίαση
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM rentals WHERE rental_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Δεν βρέθηκε η ενοικίαση προς διαγραφή' });
    }
    console.log('✅ Rental deleted:', id);
    res.json({ message: 'Η ενοικίαση διαγράφηκε επιτυχώς' });
  } catch (err) {
    console.error('❌ Error deleting rental:', err);
    res.status(500).json({ error: 'Σφάλμα κατά τη διαγραφή της ενοικίασης' });
  }
});

export default router;