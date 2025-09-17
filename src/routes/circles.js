const express = require('express');
const CircleController = require('../controllers/circleController');
const { validate, createCircleSchema, joinCircleSchema, contributionSchema } = require('../middleware/validation');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// All circle routes require authentication
router.use(authMiddleware);

// Circle management routes
router.post('/', validate(createCircleSchema), CircleController.createCircle);
router.get('/', CircleController.getAllCircles);
router.get('/my-circles', CircleController.getUserCircles);
router.get('/:id', CircleController.getCircle);
router.get('/:id/members', CircleController.getCircleMembers);
router.post('/join', validate(joinCircleSchema), CircleController.joinCircle);
router.post('/:id/setup-multisig', CircleController.setupMultiSignature);
router.post('/contribution', validate(contributionSchema), CircleController.recordContribution);
router.get('/calculate-interest', CircleController.calculateInterest);
router.patch('/:id/status', CircleController.updateCircleStatus);

module.exports = router;