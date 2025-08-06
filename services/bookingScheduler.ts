import { BookingModel } from '../models/Booking';

class BookingScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly INTERVAL_MS = 60 * 60 * 1000; // 1 hour = 60 * 60 * 1000ms

  constructor() {
    console.log('📅 BookingScheduler initialized');
  }

  //  Ξεκινήματος αυτόματου ελέγχου
  start(): void {
    if (this.intervalId) {
      console.log('⚠️ Scheduler is already running');
      return;
    }

    console.log(`🚀 Starting automatic booking expiration check (every ${this.INTERVAL_MS / 1000 / 60} minutes)`);
    
    // Τρέξε μια φορά αμέσως
    this.checkExpiredBookings();
    
    // Μετά τρέχε κάθε ώρα
    this.intervalId = setInterval(() => {
      this.checkExpiredBookings();
    }, this.INTERVAL_MS);
  }

  //  Διακοπή αυτόματου ελέγχου
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Booking scheduler stopped');
    }
  }

  //  Manual έλεγχος (για testing)
  async checkExpiredBookings(): Promise<void> {
    try {
      const now = new Date().toISOString();
      console.log(`🔍 [${now}] Checking for expired bookings...`);
      
      const result = await BookingModel.completeExpiredBookings();
      
      if (result.updated > 0) {
        console.log(`✅ [${now}] Processed ${result.updated} expired bookings:`);
        result.details.forEach(detail => {
          console.log(`   - Booking #${detail.booking_id}: ${detail.car_info} (${detail.old_status} → completed)`);
        });
      } else {
        console.log(`ℹ️ [${now}] No expired bookings found`);
      }
      
    } catch (error) {
      console.error(`❌ [${new Date().toISOString()}] Error checking expired bookings:`, error);
    }
  }

  //  Status του scheduler
  isRunning(): boolean {
    return this.intervalId !== null;
  }

  //  Επόμενος έλεγχος (για debugging)
  getNextCheckTime(): Date | null {
    if (!this.intervalId) return null;
    return new Date(Date.now() + this.INTERVAL_MS);
  }
}

// Singleton instance
export const bookingScheduler = new BookingScheduler();
export default bookingScheduler;
