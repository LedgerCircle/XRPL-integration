const Joi = require('joi');

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

// User validation schemas
const userRegistrationSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const userLoginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

// Lending circle validation schemas
const createCircleSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).optional(),
  maxMembers: Joi.number().integer().min(2).max(50).default(10),
  contributionAmount: Joi.number().positive().required(),
  contributionFrequency: Joi.string().valid('weekly', 'monthly', 'bi-weekly').required(),
  interestRate: Joi.number().min(0).max(1).default(0)
});

const joinCircleSchema = Joi.object({
  circleId: Joi.number().integer().positive().required()
});

// Contribution validation schema
const contributionSchema = Joi.object({
  circleId: Joi.number().integer().positive().required(),
  amount: Joi.number().positive().required(),
  transactionHash: Joi.string().length(64).required()
});

// XRPL address validation
const isValidXRPLAddress = (value, helpers) => {
  const xrpl = require('xrpl');
  if (!xrpl.isValidAddress(value)) {
    return helpers.error('any.invalid');
  }
  return value;
};

const xrplAddressSchema = Joi.object({
  address: Joi.string().custom(isValidXRPLAddress, 'XRPL address validation').required()
});

module.exports = {
  validate,
  userRegistrationSchema,
  userLoginSchema,
  createCircleSchema,
  joinCircleSchema,
  contributionSchema,
  xrplAddressSchema
};