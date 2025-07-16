import Joi from 'joi';

export const rentalSchema = Joi.object({
  car_id: Joi.number().integer().positive().required(),
  customer_name: Joi.string().min(2).max(100).required(),
  customer_phone: Joi.string().pattern(/^\+?\d{10,15}$/).required().messages({
    'string.pattern.base': 'Ο αριθμός τηλεφώνου δεν είναι έγκυρος',
  }),
  customer_address: Joi.string().min(5).max(255).required(),
  city: Joi.string().min(2).max(100).required(),
  postal_code: Joi.string().pattern(/^\d{4,6}$/).required().messages({
    'string.pattern.base': 'Ο ταχυδρομικός κώδικας δεν είναι έγκυρος',
  }),

   date: Joi.date()
    .iso()
    .greater('now')
    .required()
    .messages({
      'date.greater': 'Η ημερομηνία πρέπει να είναι στο μέλλον',
    }),

  total_price: Joi.number().precision(2).positive().required(),
});