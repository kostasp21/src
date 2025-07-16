import { Request, Response } from 'express';
import * as carService from '../services/cars.services';

export const getAllCars = async (req: Request, res: Response) => {
  const cars = await carService.getAllCars();
  res.json(cars);
};

export const getCarById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const car = await carService.getCarById(id);
  car ? res.json(car) : res.status(404).json({ message: 'Car not found' });
};

export const createCar = async (req: Request, res: Response) => {
  await carService.createCar(req.body);
  res.status(201).json({ message: 'Car created successfully' });
};

export const updateCar = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await carService.updateCar(id, req.body);
  res.json({ message: 'Car updated successfully' });
};

export const deleteCar = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await carService.deleteCar(id);
  res.json({ message: 'Car deleted successfully' });
};
