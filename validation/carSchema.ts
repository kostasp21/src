import Joi from 'joi';

export const carSchema = Joi.object({
  brand: Joi.string().min(2).max(50).required(),
  model: Joi.string().min(1).max(50).required(),
  description: Joi.string().allow('', null),
  date: Joi.date().iso().required(),
  price_per_day: Joi.number().precision(2).positive().required(),
  quantity: Joi.number().integer().min(0).required(),
});