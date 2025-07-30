import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

router.get('/available', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date, min_price, max_price } = req.query;

    console.log('🔍 Searching for available cars:', { 
      start_date, 
      end_date, 
      min_price,
      max_price,
      types: {
        min_price: typeof min_price,
        max_price: typeof max_price
      }
    });

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Οι ημερομηνίες start_date και end_date είναι υποχρεωτικές' });
    }

    // Convert string parameters to numbers
    const minPrice = min_price ? parseFloat(min_price as string) : null;
    const maxPrice = max_price ? parseFloat(max_price as string) : null;

    console.log('🔍 Converted prices:', { minPrice, maxPrice });

    // Build base query
    let query = `
      SELECT DISTINCT c.* 
      FROM cars c
      WHERE c.car_id NOT IN (
        SELECT DISTINCT r.car_id 
        FROM rentals r 
        WHERE r.car_id IS NOT NULL
        AND (
          (r.start_date <= $1 AND r.end_date >= $1) OR
          (r.start_date <= $2 AND r.end_date >= $2) OR  
          (r.start_date >= $1 AND r.end_date <= $2)
        )
      )
    `;

    const queryParams: any[] = [start_date, end_date];
    
    // Add price filters with proper type conversion
    if (minPrice !== null && !isNaN(minPrice)) {
      queryParams.push(minPrice);
      query += ` AND CAST(c.price_per_day AS DECIMAL) >= $${queryParams.length}`;
    }
    
    if (maxPrice !== null && !isNaN(maxPrice)) {
      queryParams.push(maxPrice);
      query += ` AND CAST(c.price_per_day AS DECIMAL) <= $${queryParams.length}`;
    }

    query += ` ORDER BY CAST(c.price_per_day AS DECIMAL) ASC`;

    console.log('🔍 Final query:', query);
    console.log('🔍 Query params:', queryParams);

    const result = await pool.query(query, queryParams);

    // Filter results again on the application level as safety measure
    let filteredResults = result.rows;
    if (minPrice !== null || maxPrice !== null) {
      filteredResults = result.rows.filter(car => {
        const price = parseFloat(car.price_per_day);
        if (minPrice !== null && price < minPrice) return false;
        if (maxPrice !== null && price > maxPrice) return false;
        return true;
      });
    }

    console.log(`✅ Found ${filteredResults.length} available cars (before filter: ${result.rows.length})`);
    
    // Log price range in results
    if (filteredResults.length > 0) {
      const prices = filteredResults.map(car => parseFloat(car.price_per_day));
      console.log('📊 Price range in results:', {
        min: Math.min(...prices),
        max: Math.max(...prices)
      });
    }

    res.json(filteredResults);
  } catch (err) {
    console.error('❌ Error finding available cars:', err);
    res.status(500).json({ error: 'Σφάλμα κατά την αναζήτηση διαθέσιμων αυτοκινήτων' });
  }
});




// GET popular cars (most rented)
router.get('/popular', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        COALESCE(r.rental_count, 0) as rental_count
      FROM cars c
      LEFT JOIN (
        SELECT 
          car_id, 
          COUNT(*) as rental_count
        FROM rentals 
        GROUP BY car_id
      ) r ON c.car_id = r.car_id
      ORDER BY r.rental_count DESC NULLS LAST, c.price_per_day ASC
      LIMIT 6
    `);

    console.log(`🌟 Retrieved ${result.rows.length} popular cars`);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching popular cars:', err);
    res.status(500).json({ error: 'Σφάλμα κατά την ανάκτηση δημοφιλών αυτοκινήτων' });
  }
});




// GET όλα τα αυτοκίνητα με φίλτρα
router.get('/', async (req: Request, res: Response) => {
  try {
    const { brand, model, min_price, max_price, search } = req.query;

    const filters: string[] = [];
    const values: any[] = [];

    // Search filter
    if (search) {
      values.push(`%${search}%`);
      filters.push(`(brand ILIKE $${values.length} OR model ILIKE $${values.length})`);
    }

    // Brand filter
    if (brand && !search) {
      values.push(`%${brand}%`);
      filters.push(`brand ILIKE $${values.length}`);
    }

    // Model filter
    if (model && !search) {
      values.push(`%${model}%`);
      filters.push(`model ILIKE $${values.length}`);
    }

    // Price range filters with proper type conversion
    if (min_price) {
      const minPrice = parseFloat(min_price as string);
      if (!isNaN(minPrice)) {
        values.push(minPrice);
        filters.push(`CAST(price_per_day AS DECIMAL) >= $${values.length}`);
      }
    }

    if (max_price) {
      const maxPrice = parseFloat(max_price as string);
      if (!isNaN(maxPrice)) {
        values.push(maxPrice);
        filters.push(`CAST(price_per_day AS DECIMAL) <= $${values.length}`);
      }
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    
    const result = await pool.query(
      `SELECT * FROM cars ${whereClause} ORDER BY CAST(price_per_day AS DECIMAL) ASC`, 
      values
    );

    console.log(`📋 Retrieved ${result.rows.length} cars with filters`);
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

    console.log(`🔍 Retrieved car:`, result.rows[0]);
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

    console.log('🚗 Creating new car:', req.body);

    if (!brand || !model || !price_per_day) {
      return res.status(400).json({ error: 'Τα πεδία brand, model και price_per_day είναι υποχρεωτικά' });
    }

    const result = await pool.query(
      `INSERT INTO cars (brand, model, description, price_per_day, quantity, image_url)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [brand, model, description, Number(price_per_day), Number(quantity) || 1, image_url]
    );

    console.log('✅ Car created successfully:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error creating car:', err);
    res.status(500).json({ error: 'Σφάλμα κατά την εισαγωγή του αυτοκινήτου' });
  }
});

// PUT ενημέρωση αυτοκινήτου
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { brand, model, description, price_per_day, quantity, image_url } = req.body;

    console.log('🔄 Updating car:', { id, body: req.body });

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

    console.log('✅ Car updated successfully:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error updating car:', err);
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
    console.log('🗑️ Car deleted successfully:', result.rows[0]);
    res.json({ message: 'Το αυτοκίνητο διαγράφηκε επιτυχώς', car: result.rows[0] });
  } catch (err) {
    console.error('❌ Error deleting car:', err);
    res.status(500).json({ error: 'Σφάλμα κατά τη διαγραφή του αυτοκινήτου' });
  }
});

export default router;