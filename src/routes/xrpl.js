const express = require('express');
const XRPLController = require('../controllers/xrplController');
const { validate, xrplAddressSchema } = require('../middleware/validation');
const { authMiddleware } = require('../middleware/auth');
const Joi = require('joi');

const router = express.Router();

// Address validation schema
const escrowSchema = Joi.object({
  destination: Joi.string().required(),
  amount: Joi.number().positive().required(),
  finishAfter: Joi.number().integer().positive().required(),
  condition: Joi.string().optional()
});

const finishEscrowSchema = Joi.object({
  escrowOwner: Joi.string().required(),
  escrowSequence: Joi.number().integer().positive().required(),
  fulfillment: Joi.string().optional()
});

const paymentSchema = Joi.object({
  destination: Joi.string().required(),
  amount: Joi.number().positive().required(),
  memo: Joi.string().optional()
});

const subscribeSchema = Joi.object({
  address: Joi.string().required()
});

// Public routes
router.post('/validate-address', validate(xrplAddressSchema), XRPLController.validateAddress);
router.get('/account/:address', XRPLController.getAccountInfo);
router.get('/transactions/:address', XRPLController.getTransactionHistory);

// Protected routes
router.use(authMiddleware);

router.post('/escrow/create', validate(escrowSchema), XRPLController.createEscrow);
router.post('/escrow/finish', validate(finishEscrowSchema), XRPLController.finishEscrow);
router.post('/payment', validate(paymentSchema), XRPLController.sendPayment);
router.get('/stored-transactions', XRPLController.getStoredTransactions);
router.post('/subscribe', validate(subscribeSchema), XRPLController.subscribeToAddressUpdates);

module.exports = router;