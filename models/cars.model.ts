export interface Car {
  car_id?: number;
  brand: string;
  model: string;
  description?: string;
  date?: Date; 
  price_per_day: number;
  quantity: number;
}