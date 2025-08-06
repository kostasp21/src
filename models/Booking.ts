import { pool } from '../db';
import { CarModel } from './cars.model';

export class BookingModel {
  
  
  static async completeExpiredBookings() {
    const now = new Date().toISOString().split('T')[0]; 
    
    try {
      console.log(`🔍 Checking for expired bookings before ${now}...`);
      
      //  simple_bookings αντί για user_bookings
      const expiredBookingsQuery = `
        SELECT sb.booking_id, sb.car_id, sb.end_date, sb.status,
               c.brand, c.model, c.quantity
        FROM simple_bookings sb
        JOIN cars c ON sb.car_id = c.car_id  
        WHERE sb.end_date < $1 
        AND sb.status IN ('confirmed', 'active')
        ORDER BY sb.end_date ASC
      `;
      
      const expiredBookings = await pool.query(expiredBookingsQuery, [now]);

      if (expiredBookings.rows.length === 0) {
        console.log('✅ No expired bookings found');
        return { updated: 0, details: [] };
      }

      console.log(`📋 Found ${expiredBookings.rows.length} expired bookings to process`);

      const details = [];
      let updated = 0;
      const updatedCarIds = new Set<number>();

      for (const booking of expiredBookings.rows) {
        const client = await pool.connect();
        
        try {
          console.log(`🔄 Processing booking #${booking.booking_id} (${booking.brand} ${booking.model})`);
          
          await client.query('BEGIN');

          //  simple_bookings αντί για user_bookings
          const updateBookingQuery = `
            UPDATE simple_bookings 
            SET status = 'completed'
            WHERE booking_id = $1
          `;
          await client.query(updateBookingQuery, [booking.booking_id]);

          //  Επαναφορά car quantity
          const restoreCarQuery = `
            UPDATE cars 
            SET quantity = quantity + 1
            WHERE car_id = $1
          `;
          await client.query(restoreCarQuery, [booking.car_id]);

          await client.query('COMMIT');

          console.log(`✅ Booking #${booking.booking_id} completed and car quantity restored`);

          updatedCarIds.add(booking.car_id);

          details.push({
            booking_id: booking.booking_id,
            car_id: booking.car_id,
            car_info: `${booking.brand} ${booking.model}`,
            old_status: booking.status,
            end_date: booking.end_date,
            action: 'completed_and_quantity_restored'
          });

          updated++;

        } catch (error) {
          await client.query('ROLLBACK');
          console.error(`❌ Error updating booking #${booking.booking_id}:`, error);
        } finally {
          client.release();
        }
      }

      // Ενημέρωση διαθεσιμότητας
      console.log(`🔄 Updating availability for ${updatedCarIds.size} cars...`);
      const carUpdateResults = [];
      
      for (const carId of updatedCarIds) {
        try {
          const result = await CarModel.updateCarAvailability(carId);
          carUpdateResults.push(result);
        } catch (error) {
          console.error(`❌ Error updating availability for car ${carId}:`, error);
        }
      }

      console.log(`🎉 Successfully updated ${updated} expired bookings and ${carUpdateResults.length} cars availability`);
      
      return { 
        updated, 
        details,
        cars_updated: carUpdateResults,
        message: `${updated} bookings auto-completed, ${carUpdateResults.length} cars availability updated`
      };

    } catch (error) {
      console.error('❌ Error in completeExpiredBookings:', error);
      throw error;
    }
  }

  //  Στατιστικά για simple_bookings
  static async getBookingStats() {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*)::int as total_bookings,
          COUNT(CASE WHEN status = 'pending' THEN 1 END)::int as pending,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END)::int as confirmed,
          COUNT(CASE WHEN status = 'active' THEN 1 END)::int as active,
          COUNT(CASE WHEN status = 'completed' THEN 1 END)::int as completed,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::int as cancelled,
          COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_price ELSE 0 END), 0)::decimal as total_revenue
        FROM simple_bookings
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      `;
      
      const result = await pool.query(statsQuery);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error getting booking stats:', error);
      throw error;
    }
  }

  //  Upcoming expirations για simple_bookings
  static async getUpcomingExpirations(days: number = 1) {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      const futureDateString = futureDate.toISOString().split('T')[0];

      const query = `
        SELECT sb.booking_id, sb.end_date, sb.customer_name, sb.customer_email,
               c.brand, c.model
        FROM simple_bookings sb
        JOIN cars c ON sb.car_id = c.car_id
        WHERE sb.end_date <= $1
        AND sb.status IN ('confirmed', 'active')
        ORDER BY sb.end_date ASC
      `;

      const result = await pool.query(query, [futureDateString]);
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting upcoming expirations:', error);
      throw error;
    }
  }

  //  Λήψη όλων των κρατήσεων για admin
  static async getAllBookings() {
    try {
      const query = `
        SELECT 
          sb.*,
          c.brand,
          c.model,
          c.price_per_day,
          c.image_url
        FROM simple_bookings sb
        JOIN cars c ON sb.car_id = c.car_id
        ORDER BY sb.created_at DESC
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting all bookings:', error);
      throw error;
    }
  }
}

export default BookingModel;