import { Router, Request, Response } from 'express';
import {pool} from '../db';
import { validateBody } from '../middleware/validate';
import { rentalSchema } from '../validation/rentalSchema';

import { NextFunction } from 'express';

//import { authenticateToken } from './middleware/authenticateToken';

const router = Router();


/**
 * @swagger
 * tags:
 *   name: Rentals
 *   description: Διαχείριση ενοικιάσεων
 */


/**
 * @swagger
 * /rentals:
 *   get:
 *     summary: Λήψη όλων των ενοικιάσεων
 *     tags: [Rentals]
 *     responses:
 *       200:
 *         description: Λίστα με όλες τις ενοικιάσεις
 */


// GET όλα τα rentals
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM rental');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Σφάλμα κατά την ανάκτηση των ενοικιάσεων' });
  }
});


/**
 * @swagger
 * /rentals/{id}:
 *   get:
 *     summary: Λήψη ενοικίασης με βάση το ID
 *     tags: [Rentals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Η ενοικίαση
 *       404:
 *         description: Δεν βρέθηκε
 */

// GET μία ενοικίαση
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM rental WHERE rental_id = $1', [id]);
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

/**
 * @swagger
 * /rentals:
 *   post:
 *     summary: Δημιουργία νέας ενοικίασης
 *     tags: [Rentals]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - car_id
 *               - customer_name
 *             properties:
 *               car_id:
 *                 type: integer
 *               customer_name:
 *                 type: string
 *               customer_phone:
 *                 type: string
 *               customer_address:
 *                 type: string
 *               city:
 *                 type: string
 *               postal_code:
 *                 type: string
 *               date:
 *                 type: string
 *               total_price:
 *                 type: number
 *     responses:
 *       201:
 *         description: Επιτυχής δημιουργία
 */

// POST νέα ενοικίαση με validation
router.post('/', validateBody(rentalSchema), async (req: Request, res: Response, next: NextFunction) => {
  const { car_id, customer_name, customer_phone, customer_address, city, postal_code, date, total_price } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO rental (car_id, customer_name, customer_phone, customer_address, city, postal_code, date, total_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [car_id, customer_name, customer_phone, customer_address, city, postal_code, date, total_price]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    const error = new Error('Σφάλμα κατά την εισαγωγή της ενοικίασης') as any;
    error.statusCode = 500;
    next(error);
  }
});

/**
 * @swagger
 * /rentals/{id}:
 *   put:
 *     summary: Ενημέρωση ενοικίασης
 *     tags: [Rentals]
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
 *               car_id:
 *                 type: integer
 *               customer_name:
 *                 type: string
 *               customer_phone:
 *                 type: string
 *               customer_address:
 *                 type: string
 *               city:
 *                 type: string
 *               postal_code:
 *                 type: string
 *               date:
 *                 type: string
 *               total_price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Επιτυχής ενημέρωση
 *       404:
 *         description: Δεν βρέθηκε
 */

// PUT ενημέρωση ενοικίασης με validation
router.put('/:id', validateBody(rentalSchema), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { car_id, customer_name, customer_phone, customer_address, city, postal_code,date, total_price } = req.body;

  try {
    const result = await pool.query(
      `UPDATE rental SET
        car_id = $1,
        customer_name = $2,
        customer_phone = $3,
        customer_address = $4,
        city = $5,
        postal_code = $6,
        date = $7,
        total_price = $8
       WHERE rental_id = $9
       RETURNING *`,
      [car_id, customer_name, customer_phone, customer_address, city, postal_code, date, total_price, id]
    );

    if (result.rows.length === 0) {

      return res.status(404).json({ error: 'Δεν βρέθηκε η ενοικίαση για ενημέρωση' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Σφάλμα κατά την εισαγωγή της ενοικίασης:', err);
    res.status(500).json({ error: 'Σφάλμα κατά την ενημέρωση της ενοικίασης' });
  }
});

/**
 * @swagger
 * /rentals/{id}:
 *   delete:
 *     summary: Διαγραφή ενοικίασης
 *     tags: [Rentals]
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

// DELETE ενοικίαση
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM rental WHERE rental_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Δεν βρέθηκε η ενοικίαση προς διαγραφή' });
    }
    res.json({ message: 'Η ενοικίαση διαγράφηκε επιτυχώς' });
  } catch (err) {
    res.status(500).json({ error: 'Σφάλμα κατά τη διαγραφή της ενοικίασης' });
  }
});

export default router;