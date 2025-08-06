import {pool} from '../db';
import { Car } from '../models/cars.model';

export const getAllCars = async (): Promise<Car[]> => {
  const result = await pool.query('SELECT * FROM cars');
  return result.rows;
};

export const getCarById = async (id: number): Promise<Car | null> => {
  const result = await pool.query('SELECT * FROM cars WHERE car_id = $1', [id]);
  return result.rows[0] || null;
};

export const createCar = async (car: Car): Promise<void> => {
  const { brand, model, description, price_per_day, quantity } = car;
  await pool.query(
    'INSERT INTO cars (brand, model, description, price_per_day, quantity) VALUES ($1, $2, $3, $4, $5)',
    [brand, model, description, price_per_day, quantity]
  );
};

export const updateCar = async (id: number, car: Car): Promise<void> => {
  const { brand, model, description, price_per_day, quantity } = car;
  await pool.query(
    'UPDATE cars SET brand=$1, model=$2, description=$3, price_per_day=$4, quantity=$5 WHERE car_id=$6',
    [brand, model, description, price_per_day, quantity, id]
  );
};

export const deleteCar = async (id: number): Promise<void> => {
  await pool.query('DELETE FROM cars WHERE car_id=$1', [id]);
};