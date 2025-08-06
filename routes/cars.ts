import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { CarModel } from '../models/cars.model';

const router = Router();

// Available cars με σωστό έλεγχο διαθεσιμότητας
router.get('/available', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date, min_price, max_price } = req.query;

    console.log('🔍 Searching for available cars:', { 
      start_date, 
      end_date, 
      min_price,
      max_price
    });

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Οι ημερομηνίες start_date και end_date είναι υποχρεωτικές' });
    }

    // Convert string parameters to numbers
    const minPrice = min_price ? parseFloat(min_price as string) : null;
    const maxPrice = max_price ? parseFloat(max_price as string) : null;

    console.log('💰 Converted prices:', { minPrice, maxPrice });

    //  χρησιμοποιεί simple_bookings αντί για user_bookings
    let query = `
      SELECT 
        c.*,
        (
          c.quantity - COALESCE((
            SELECT COUNT(*)
            FROM simple_bookings sb
            WHERE sb.car_id = c.car_id
            AND sb.status IN ('confirmed', 'active')
            AND (
              (sb.start_date <= $1 AND sb.end_date >= $1) OR
              (sb.start_date <= $2 AND sb.end_date >= $2) OR
              (sb.start_date >= $1 AND sb.end_date <= $2)
            )
          ), 0)
        ) as available_quantity,
        CASE 
          WHEN c.quantity <= 0 THEN false
          ELSE (
            c.quantity > COALESCE((
              SELECT COUNT(*)
              FROM simple_bookings sb
              WHERE sb.car_id = c.car_id
              AND sb.status IN ('confirmed', 'active')
              AND (
                (sb.start_date <= $1 AND sb.end_date >= $1) OR
                (sb.start_date <= $2 AND sb.end_date >= $2) OR
                (sb.start_date >= $1 AND sb.end_date <= $2)
              )
            ), 0)
          )
        END as is_available
      FROM cars c
      WHERE c.available = true
    `;

    const queryParams: any[] = [start_date, end_date];
    
    // Add price filters
    if (minPrice !== null && !isNaN(minPrice)) {
      queryParams.push(minPrice);
      query += ` AND CAST(c.price_per_day AS DECIMAL) >= $${queryParams.length}`;
    }
    
    if (maxPrice !== null && !isNaN(maxPrice)) {
      queryParams.push(maxPrice);
      query += ` AND CAST(c.price_per_day AS DECIMAL) <= $${queryParams.length}`;
    }

    //  Φιλτράρισμα μόνο διαθέσιμων αυτοκινήτων
    query += ` 
      HAVING (
        c.quantity > COALESCE((
          SELECT COUNT(*)
          FROM simple_bookings sb
          WHERE sb.car_id = c.car_id
          AND sb.status IN ('confirmed', 'active')
          AND (
            (sb.start_date <= $1 AND sb.end_date >= $1) OR
            (sb.start_date <= $2 AND sb.end_date >= $2) OR
            (sb.start_date >= $1 AND sb.end_date <= $2)
          )
        ), 0)
      )
      ORDER BY CAST(c.price_per_day AS DECIMAL) ASC
    `;

    console.log('📋 Final query:', query);
    console.log('🔧 Query params:', queryParams);

    const result = await pool.query(query, queryParams);

    // Additional application-level filtering για ασφάλεια
    let filteredResults = result.rows.filter(car => {
      const price = parseFloat(car.price_per_day);
      if (minPrice !== null && price < minPrice) return false;
      if (maxPrice !== null && price > maxPrice) return false;
      return car.is_available && car.available_quantity > 0;
    });

    console.log(`✅ Found ${filteredResults.length} available cars (total checked: ${result.rows.length})`);
    
    // Log availability details
    if (filteredResults.length > 0) {
      const prices = filteredResults.map(car => parseFloat(car.price_per_day));
      const availabilities = filteredResults.map(car => car.available_quantity);
      
      console.log('📊 Results summary:', {
        price_range: { min: Math.min(...prices), max: Math.max(...prices) },
        availability_range: { min: Math.min(...availabilities), max: Math.max(...availabilities) },
        sample_cars: filteredResults.slice(0, 3).map(car => ({
          id: car.car_id,
          name: `${car.brand} ${car.model}`,
          price: car.price_per_day,
          available: car.available_quantity
        }))
      });
    }

    res.json(filteredResults);
  } catch (err) {
    console.error('❌ Error finding available cars:', err);
    res.status(500).json({ error: 'Σφάλμα κατά την αναζήτηση διαθέσιμων αυτοκινήτων' });
  }
});

//  endpoint για car availability update
router.post('/update-availability', async (req: Request, res: Response) => {
  try {
    console.log('🔧 Manual car availability update requested');
    
    const results = await CarModel.updateAllCarsAvailability();
    
    res.json({
      success: true,
      message: 'Car availability updated successfully',
      updated_cars: results.length,
      details: results
    });
  } catch (error) {
    console.error('❌ Car availability update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating car availability',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

//  Έλεγχος διαθεσιμότητας συγκεκριμένου αυτοκινήτου
router.get('/:id/availability', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ 
        error: 'Οι παράμετροι start_date και end_date είναι υποχρεωτικές' 
      });
    }

    const availability = await CarModel.checkCarAvailability(
      parseInt(id), 
      start_date as string, 
      end_date as string
    );

    res.json({
      car_id: parseInt(id),
      dates: { start_date, end_date },
      ...availability
    });
  } catch (err) {
    console.error('❌ Error checking car availability:', err);
    res.status(500).json({ error: 'Σφάλμα κατά τον έλεγχο διαθεσιμότητας' });
  }
});

//  Popular cars με σωστό έλεγχο
router.get('/popular', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        COALESCE(ub.booking_count, 0) as booking_count,
        (
          c.quantity - COALESCE((
            SELECT COUNT(*)
            FROM user_bookings ub2
            WHERE ub2.car_id = c.car_id
            AND ub2.status IN ('confirmed', 'active')
            AND ub2.end_date >= CURRENT_DATE
          ), 0)
        ) as current_available_quantity
      FROM cars c
      LEFT JOIN (
        SELECT 
          car_id, 
          COUNT(*) as booking_count
        FROM user_bookings 
        WHERE status IN ('confirmed', 'active', 'completed')
        GROUP BY car_id
      ) ub ON c.car_id = ub.car_id
      WHERE c.available = true
      ORDER BY ub.booking_count DESC NULLS LAST, c.price_per_day ASC
      LIMIT 6
    `);

    console.log(`🌟 Retrieved ${result.rows.length} popular cars`);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching popular cars:', err);
    res.status(500).json({ error: 'Σφάλμα κατά την ανάκτηση δημοφιλών αυτοκινήτων' });
  }
});

//  Όλα τα αυτοκίνητα με availability info
router.get('/', async (req: Request, res: Response) => {
  try {
    const { brand, model, min_price, max_price, search } = req.query;

    const filters: string[] = [];
    const values: any[] = [];

    // Search filter
    if (search) {
      values.push(`%${search}%`);
      filters.push(`(c.brand ILIKE $${values.length} OR c.model ILIKE $${values.length})`);
    }

    // Brand filter
    if (brand && !search) {
      values.push(`%${brand}%`);
      filters.push(`c.brand ILIKE $${values.length}`);
    }

    // Model filter
    if (model && !search) {
      values.push(`%${model}%`);
      filters.push(`c.model ILIKE $${values.length}`);
    }

    // Price range filters
    if (min_price) {
      const minPrice = parseFloat(min_price as string);
      if (!isNaN(minPrice)) {
        values.push(minPrice);
        filters.push(`CAST(c.price_per_day AS DECIMAL) >= $${values.length}`);
      }
    }

    if (max_price) {
      const maxPrice = parseFloat(max_price as string);
      if (!isNaN(maxPrice)) {
        values.push(maxPrice);
        filters.push(`CAST(c.price_per_day AS DECIMAL) <= $${values.length}`);
      }
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    
    //  Enhanced query με availability info
    const query = `
      SELECT 
        c.*,
        (
          c.quantity - COALESCE((
            SELECT COUNT(*)
            FROM user_bookings ub
            WHERE ub.car_id = c.car_id
            AND ub.status IN ('confirmed', 'active')
            AND ub.end_date >= CURRENT_DATE
          ), 0)
        ) as current_available_quantity,
        COALESCE((
          SELECT COUNT(*)
          FROM user_bookings ub
          WHERE ub.car_id = c.car_id
          AND ub.status IN ('confirmed', 'active')
          AND ub.end_date >= CURRENT_DATE
        ), 0) as active_bookings
      FROM cars c
      ${whereClause}
      ORDER BY CAST(c.price_per_day AS DECIMAL) ASC
    `;
    
    const result = await pool.query(query, values);

    console.log(`📋 Retrieved ${result.rows.length} cars with availability info`);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching cars:', err);
    res.status(500).json({ error: 'Σφάλμα κατά την ανάκτηση αυτοκινήτων' });
  }
});

// GET ένα αυτοκίνητο
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'Μη έγκυρο ID αυτοκινήτου' });
    }

    const result = await pool.query('SELECT * FROM cars WHERE car_id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Το αυτοκίνητο δεν βρέθηκε' });
    }

    console.log(` Retrieved car:`, result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error fetching car:', err);
    res.status(500).json({ error: 'Σφάλμα κατά την ανάκτηση του αυτοκινήτου' });
  }
});

// POST νέο αυτοκίνητο
router.post('/', async (req: Request, res: Response) => {
  try {
    const { brand, model, description, price_per_day, quantity, image_url } = req.body;

    console.log(' Creating new car:', req.body);

    if (!brand || !model || !price_per_day) {
      return res.status(400).json({ error: 'Τα πεδία brand, model και price_per_day είναι υποχρεωτικά' });
    }

    const result = await pool.query(
      `INSERT INTO cars (brand, model, description, price_per_day, quantity, image_url)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [brand, model, description, Number(price_per_day), Number(quantity) || 1, image_url]
    );

    console.log(' Car created successfully:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(' Error creating car:', err);
    res.status(500).json({ error: 'Σφάλμα κατά την εισαγωγή του αυτοκινήτου' });
  }
});

// PUT ενημέρωση αυτοκινήτου
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { brand, model, description, price_per_day, quantity, image_url } = req.body;

    console.log(' Updating car:', { id, body: req.body });

    if (!brand || !model || !price_per_day) {
      return res.status(400).json({ error: 'Τα πεδία brand, model και price_per_day είναι υποχρεωτικά' });
    }

    const result = await pool.query(
      `UPDATE cars 
       SET brand = $1, model = $2, description = $3, price_per_day = $4, quantity = $5, image_url = $6
       WHERE car_id = $7 
       RETURNING *`,
      [brand, model, description, Number(price_per_day), Number(quantity) || 1, image_url, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Το αυτοκίνητο δεν βρέθηκε για ενημέρωση' });
    }

    console.log(' Car updated successfully:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(' Error updating car:', err);
    res.status(500).json({ error: 'Σφάλμα κατά την ενημέρωση του αυτοκινήτου' });
  }
});

// DELETE αυτοκίνητο
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM cars WHERE car_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Το αυτοκίνητο δεν βρέθηκε για διαγραφή' });
    }
    console.log(' Car deleted successfully:', result.rows[0]);
    res.json({ message: 'Το αυτοκίνητο διαγράφηκε επιτυχώς', car: result.rows[0] });
  } catch (err) {
    console.error(' Error deleting car:', err);
    res.status(500).json({ error: 'Σφάλμα κατά τη διαγραφή του αυτοκινήτου' });
  }
});

export default router;