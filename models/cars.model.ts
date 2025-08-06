import { pool } from '../db';

export interface Car {
  car_id: number;
  brand: string;
  model: string;
  description?: string;
  price_per_day: number;
  quantity: number;
  available: boolean;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
}

export class CarModel {
  
  
  static async updateCarAvailability(carId: number) {
    try {
      const now = new Date().toISOString().split('T')[0];
      
      //  simple_bookings αντί για user_bookings
      const activeBookingsQuery = `
        SELECT COUNT(*) as active_count
        FROM simple_bookings
        WHERE car_id = $1
        AND status IN ('confirmed', 'active')
        AND end_date >= $2
      `;
      
      const activeResult = await pool.query(activeBookingsQuery, [carId, now]);
      const activeCount = parseInt(activeResult.rows[0].active_count);
      
      const carQuery = `SELECT quantity, brand, model FROM cars WHERE car_id = $1`;
      const carResult = await pool.query(carQuery, [carId]);
      
      if (carResult.rows.length === 0) {
        throw new Error(`Car with ID ${carId} not found`);
      }
      
      const car = carResult.rows[0];
      const totalQuantity = car.quantity;
      const isAvailable = activeCount < totalQuantity;
      
      const updateQuery = `
        UPDATE cars 
        SET available = $1
        WHERE car_id = $2
      `;
      
      await pool.query(updateQuery, [isAvailable, carId]);
      
      console.log(
        `🔄 Car #${carId} (${car.brand} ${car.model}) availability updated: ${isAvailable} ` +
        `(${activeCount}/${totalQuantity} active bookings)`
      );
      
      return { 
        carId, 
        brand: car.brand,
        model: car.model,
        isAvailable, 
        activeCount, 
        totalQuantity 
      };
    } catch (error) {
      console.error(`❌ Error updating availability for car ${carId}:`, error);
      throw error;
    }
  }

  //  Μαζική ενημέρωση διαθεσιμότητας όλων των αυτοκινήτων
  static async updateAllCarsAvailability() {
    try {
      console.log('🔄 Updating availability for all cars...');
      
      const carsQuery = `SELECT car_id, brand, model FROM cars ORDER BY car_id`;
      const carsResult = await pool.query(carsQuery);
      
      const results: Array<{
        carId: number;
        brand: any;
        model: any;
        isAvailable?: boolean;
        activeCount?: number;
        totalQuantity?: any;
        error?: string;
      }> = [];
      
      for (const car of carsResult.rows) {
        try {
          const result = await this.updateCarAvailability(car.car_id);
          results.push(result);
        } catch (error) {
          console.error(`❌ Error updating car ${car.car_id}:`, error);
          results.push({
            carId: car.car_id,
            brand: car.brand,
            model: car.model,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      const successCount = results.filter(r => !r.error).length;
      console.log(`✅ Successfully updated availability for ${successCount}/${results.length} cars`);
      
      return results;
    } catch (error) {
      console.error('❌ Error in bulk availability update:', error);
      throw error;
    }
  }

  //  χρησιμοποιεί simple_bookings
  static async checkCarAvailability(carId: number, startDate: string, endDate: string) {
    try {
      // simple_bookings αντί για user_bookings
      const query = `
        SELECT 
          c.quantity,
          COALESCE((
            SELECT COUNT(*)
            FROM simple_bookings sb
            WHERE sb.car_id = c.car_id
            AND sb.status IN ('confirmed', 'active')
            AND (
              (sb.start_date <= $2 AND sb.end_date >= $2) OR
              (sb.start_date <= $3 AND sb.end_date >= $3) OR
              (sb.start_date >= $2 AND sb.end_date <= $3)
            )
          ), 0) as conflicting_bookings
        FROM cars c
        WHERE c.car_id = $1
      `;
      
      const result = await pool.query(query, [carId, startDate, endDate]);
      
      if (result.rows.length === 0) {
        return { available: false, reason: 'Car not found' };
      }
      
      const { quantity, conflicting_bookings } = result.rows[0];
      const availableQuantity = quantity - conflicting_bookings;
      
      return {
        available: availableQuantity > 0,
        total_quantity: quantity,
        conflicting_bookings: parseInt(conflicting_bookings),
        available_quantity: availableQuantity
      };
    } catch (error) {
      console.error('❌ Error checking car availability:', error);
      throw error;
    }
  }
}

export default CarModel;