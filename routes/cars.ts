import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { validateBody } from '../middleware/validate';
import { carSchema } from '../validation/carSchema';

//import { authenticateToken } from './middleware/authenticateToken';

const router = Router();

/**  
 * @swagger
 * tags:
 *   name: Cars
 *   description: Διαχείριση αυτοκινήτων
 */


/** 
 * @swagger
 * /cars:
 *   get:
 *     summary: Λήψη όλων των αυτοκινήτων
 *     tags: [Cars]
 *     responses:
 *       200:
 *         description: Λίστα με όλα τα αυτοκίνητα
 */


// GET όλα τα αυτοκίνητα
router.get('/', async (req: Request, res: Response) => {
  
 const { brand, model, min_price, max_price } = req.query;

  const filters: string[] = [];
  const values: any[] = [];

  if (brand) {
    values.push(`%${brand}%`);
    filters.push(`brand ILIKE $${values.length}`);
  }

  if (model) {
    values.push(`%${model}%`);
    filters.push(`model ILIKE $${values.length}`);
  }

  if (min_price) {
    values.push(min_price);
    filters.push(`price_per_day >= $${values.length}`);
  }

  if (max_price) {
    values.push(max_price);
    filters.push(`price_per_day <= $${values.length}`);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  try {
    const result = await pool.query(`SELECT * FROM cars ${whereClause}`, values);
    res.json(result.rows);
  } catch (err) {
    console.error('Error searching cars:', err);
    res.status(500).json({ error: 'Σφάλμα κατά την αναζήτηση αυτοκινήτων' });
  }
});


/** 
 * @swagger
 * /cars/{id}:
 *   get:
 *     summary: Λήψη αυτοκινήτου με βάση το ID
 *     tags: [Cars]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Το αυτοκίνητο
 *       404:
 *         description: Δεν βρέθηκε
 */

// GET ένα αυτοκίνητο με βάση το car_id
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM cars WHERE car_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Το αυτοκίνητο δεν βρέθηκε' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα κατά την ανάκτηση του αυτοκινήτου' });
  }
});

/**
 * @swagger
 * /cars:
 *   post:
 *     summary: Δημιουργία νέου αυτοκινήτου
 *     tags: [Cars]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - brand
 *               - model
 *               - price_per_day
 *               - quantity
 *             properties:
 *               brand:
 *                 type: string
 *               model:
 *                 type: string
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               price_per_day:
 *                 type: number
 *               quantity:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Επιτυχής δημιουργία
 */

// POST νέο αυτοκίνητο
router.post('/',validateBody(carSchema), async (req: Request, res: Response) => {
  const { brand, model, description, date, price_per_day, quantity } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO cars (brand, model, description, date, price_per_day, quantity)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [brand, model, description, date, price_per_day, quantity]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα κατά την εισαγωγή του αυτοκινήτου' });
  }
});

/**
 * @swagger
 * /cars/{id}:
 *   put:
 *     summary: Ενημέρωση αυτοκινήτου
 *     tags: [Cars]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               brand:
 *                 type: string
 *               model:
 *                 type: string
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *               price_per_day:
 *                 type: number
 *               quantity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Επιτυχής ενημέρωση
 *       404:
 *         description: Δεν βρέθηκε
 */

// PUT ενημέρωση αυτοκινήτου
router.put('/:id',validateBody(carSchema), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { brand, model, description, date, price_per_day, quantity } = req.body;
  try {
    const result = await pool.query(
      `UPDATE cars SET brand = $1, model = $2, description = $3, date = $4, price_per_day = $5, quantity = $6
       WHERE car_id = $7 RETURNING *`,
      [brand, model, description, date, price_per_day, quantity, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Το αυτοκίνητο δεν βρέθηκε για ενημέρωση' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα κατά την ενημέρωση του αυτοκινήτου' });
  }
});

/**
 * @swagger
 * /cars/{id}:
 *   delete:
 *     summary: Διαγραφή αυτοκινήτου
 *     tags: [Cars]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Επιτυχής διαγραφή
 *       404:
 *         description: Δεν βρέθηκε
 */

// DELETE αυτοκίνητο
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM cars WHERE car_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Το αυτοκίνητο δεν βρέθηκε για διαγραφή' });
    }
    res.json({ message: 'Το αυτοκίνητο διαγράφηκε επιτυχώς', car: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Σφάλμα κατά τη διαγραφή του αυτοκινήτου' });
  }
});

export default router;