const express = require('express');
const AuthController = require('../controllers/authController');
const { validate, userRegistrationSchema, userLoginSchema } = require('../middleware/validation');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', validate(userRegistrationSchema), AuthController.register);
router.post('/login', validate(userLoginSchema), AuthController.login);

// Protected routes
router.get('/profile', authMiddleware, AuthController.getProfile);
router.post('/fund-wallet', authMiddleware, AuthController.fundWallet);
router.post('/verify', authMiddleware, AuthController.verifyUser);

module.exports = router;