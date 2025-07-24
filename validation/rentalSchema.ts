import Joi from 'joi';

export const rentalSchema = Joi.object({
  car_id: Joi.number().integer().positive().required(),
  customer_name: Joi.string().min(2).max(100).required(),
  customer_phone: Joi.string().min(10).max(15).required(),
  customer_address: Joi.string().min(5).max(200).required(),
  city: Joi.string().min(2).max(50).required(),
  postal_code: Joi.string().min(5).max(10).required(),
  start_date: Joi.date().required(),
  end_date: Joi.date().min(Joi.ref('start_date')).required(),
  days: Joi.number().integer().positive().required(),
  total_price: Joi.number().positive().required()
});