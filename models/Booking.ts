import { Pool, PoolClient } from 'pg';
import pool from '../db';

export interface BookingData {
  user_id: number;
  car_id: number;
  start_date: string;
  end_date: string;
  total_price: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  notes?: string;
}

export interface Booking {
  booking_id: number;
  user_id: number;
  car_id: number;
  start_date: string;
  end_date: string;
  total_price: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields από cars table
  brand?: string;
  model?: string;
  image_url?: string;
  price_per_day?: number;
  description?: string;
}

export interface BookingStats {
  total_bookings: number;
  pending_bookings: number;
  confirmed_bookings: number;
  active_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  total_spent: number;
  total_paid: number;
}

export class BookingModel {
  
  // ✅ Λήψη όλων των κρατήσεων ενός χρήστη
  static async getUserBookings(userId: number): Promise<Booking[]> {
    try {
      const query = `
        SELECT 
          ub.*,
          c.brand,
          c.model,
          c.image_url,
          c.price_per_day
        FROM user_bookings ub
        JOIN cars c ON ub.car_id = c.car_id
        WHERE ub.user_id = $1
        ORDER BY ub.created_at DESC
      `;
      
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('❌ Error fetching user bookings:', error);
      throw error;
    }
  }

  // ✅ Δημιουργία νέας κράτησης
  static async createBooking(bookingData: BookingData): Promise<Booking> {
    const client: PoolClient = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const {
        user_id,
        car_id,
        start_date,
        end_date,
        total_price,
        customer_name,
        customer_email,
        customer_phone,
        notes
      } = bookingData;

      // Έλεγχος διαθεσιμότητας αυτοκινήτου
      const availabilityQuery = `
        SELECT car_id, quantity 
        FROM cars 
        WHERE car_id = $1 AND quantity > 0
      `;
      const availabilityResult = await client.query(availabilityQuery, [car_id]);
      
      if (availabilityResult.rows.length === 0) {
        throw new Error('Το αυτοκίνητο δεν είναι διαθέσιμο');
      }

      // Έλεγχος για επικαλυπτόμενες κρατήσεις
      const conflictQuery = `
        SELECT booking_id 
        FROM user_bookings 
        WHERE car_id = $1 
          AND status IN ('confirmed', 'active')
          AND (
            (start_date <= $2 AND end_date > $2) OR
            (start_date < $3 AND end_date >= $3) OR
            (start_date >= $2 AND end_date <= $3)
          )
      `;
      const conflictResult = await client.query(conflictQuery, [car_id, start_date, end_date]);
      
      if (conflictResult.rows.length > 0) {
        throw new Error('Το αυτοκίνητο δεν είναι διαθέσιμο για τις επιλεγμένες ημερομηνίες');
      }

      // Δημιουργία κράτησης
      const insertQuery = `
        INSERT INTO user_bookings 
        (user_id, car_id, start_date, end_date, total_price, customer_name, customer_email, customer_phone, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const values = [
        user_id,
        car_id,
        start_date,
        end_date,
        total_price,
        customer_name,
        customer_email,
        customer_phone || null,
        notes || null
      ];

      const result = await client.query(insertQuery, values);
      
      await client.query('COMMIT');
      return result.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error creating booking:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ✅ Λήψη μίας κράτησης
  static async getBookingById(bookingId: number, userId?: number): Promise<Booking | null> {
    try {
      let query = `
        SELECT 
          ub.*,
          c.brand,
          c.model,
          c.image_url,
          c.price_per_day,
          c.description
        FROM user_bookings ub
        JOIN cars c ON ub.car_id = c.car_id
        WHERE ub.booking_id = $1
      `;
      
      const values: (number)[] = [bookingId];
      
      // Αν δοθεί userId, ελέγχουμε ότι η κράτηση ανήκει στον χρήστη
      if (userId !== undefined) {
        query += ` AND ub.user_id = $2`;
        values.push(userId);
      }

      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error fetching booking:', error);
      throw error;
    }
  }

  // ✅ Ενημέρωση κράτησης
  static async updateBooking(
    bookingId: number, 
    updateData: Partial<Pick<Booking, 'status' | 'customer_name' | 'customer_email' | 'customer_phone' | 'notes'>>, 
    userId?: number // ✅ ΑΛΛΑΓΗ: Optional για admin use
  ): Promise<Booking | null> {
    try {
      const allowedFields = ['status', 'customer_name', 'customer_email', 'customer_phone', 'notes'];
      const setClause: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      // Δημιουργία dynamic update query
      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          setClause.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      }

      if (setClause.length === 0) {
        throw new Error('No valid fields to update');
      }

      setClause.push(`updated_at = CURRENT_TIMESTAMP`);

      let query = `
        UPDATE user_bookings 
        SET ${setClause.join(', ')}
        WHERE booking_id = $${paramCount}
      `;
      
      values.push(bookingId);
      
      // ✅ ΑΛΛΑΓΗ: Only add user check if userId provided
      if (userId !== undefined) {
        query += ` AND user_id = $${paramCount + 1}`;
        values.push(userId);
      }
      
      query += ` RETURNING *`;

      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error updating booking:', error);
      throw error;
    }
  }

  // ✅ Ακύρωση κράτησης
  static async cancelBooking(bookingId: number, userId: number): Promise<Booking | null> {
    try {
      return await this.updateBooking(bookingId, { status: 'cancelled' }, userId);
    } catch (error) {
      console.error('❌ Error cancelling booking:', error);
      throw error;
    }
  }

  // ✅ Στατιστικά χρήστη
  static async getUserBookingStats(userId: number): Promise<BookingStats> {
    try {
      const query = `
        SELECT 
          COUNT(*)::int as total_bookings,
          COUNT(CASE WHEN status = 'pending' THEN 1 END)::int as pending_bookings,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END)::int as confirmed_bookings,
          COUNT(CASE WHEN status = 'active' THEN 1 END)::int as active_bookings,
          COUNT(CASE WHEN status = 'completed' THEN 1 END)::int as completed_bookings,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::int as cancelled_bookings,
          COALESCE(SUM(total_price), 0)::decimal as total_spent,
          COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_price ELSE 0 END), 0)::decimal as total_paid
        FROM user_bookings 
        WHERE user_id = $1
      `;

      const result = await pool.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error fetching booking stats:', error);
      throw error;
    }
  }

  // ✅ ΠΡΟΣΘΗΚΗ: Admin method για όλες τις κρατήσεις
  static async getAllBookings(): Promise<Booking[]> {
    try {
      const query = `
        SELECT 
          ub.*,
          c.brand,
          c.model,
          c.image_url,
          c.price_per_day,
          c.description
        FROM user_bookings ub
        JOIN cars c ON ub.car_id = c.car_id
        ORDER BY ub.created_at DESC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('❌ Error fetching all bookings:', error);
      throw error;
    }
  }

  // ✅ ΠΡΟΣΘΗΚΗ: Admin method για στατιστικά συστήματος
  static async getAllBookingStats(): Promise<BookingStats> {
    try {
      const query = `
        SELECT 
          COUNT(*)::int as total_bookings,
          COUNT(CASE WHEN status = 'pending' THEN 1 END)::int as pending_bookings,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END)::int as confirmed_bookings,
          COUNT(CASE WHEN status = 'active' THEN 1 END)::int as active_bookings,
          COUNT(CASE WHEN status = 'completed' THEN 1 END)::int as completed_bookings,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::int as cancelled_bookings,
          COALESCE(SUM(total_price), 0)::decimal as total_spent,
          COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_price ELSE 0 END), 0)::decimal as total_paid
        FROM user_bookings
      `;

      const result = await pool.query(query);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error fetching all booking stats:', error);
      throw error;
    }
  }
}

export default BookingModel;