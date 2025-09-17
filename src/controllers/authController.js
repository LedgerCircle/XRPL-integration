const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

class AuthController {
  static async register(req, res) {
    try {
      const { username, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      const existingEmail = await User.findByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      // Create new user
      const user = await User.create({ username, email, password });
      
      // Generate token
      const token = generateToken(user.id);

      // Fund testnet wallet for demo purposes
      await User.fundTestnetWallet(user.id);

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          xrpl_address: user.xrpl_address,
          verification_status: user.verification_status
        },
        token
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Failed to register user' });
    }
  }

  static async login(req, res) {
    try {
      const { username, password } = req.body;

      // Find user
      const user = await User.findByUsername(username);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const isValidPassword = await User.verifyPassword(user, password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate token
      const token = generateToken(user.id);

      // Get user balance
      const balance = await User.getBalance(user.id);

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          xrpl_address: user.xrpl_address,
          verification_status: user.verification_status,
          balance
        },
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Failed to login' });
    }
  }

  static async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const balance = await User.getBalance(userId);

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          xrpl_address: user.xrpl_address,
          verification_status: user.verification_status,
          balance,
          created_at: user.created_at
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Failed to get user profile' });
    }
  }

  static async fundWallet(req, res) {
    try {
      const userId = req.user.id;
      const funded = await User.fundTestnetWallet(userId);

      if (funded) {
        const balance = await User.getBalance(userId);
        res.json({
          message: 'Wallet funded successfully',
          balance
        });
      } else {
        res.status(400).json({ error: 'Failed to fund wallet' });
      }
    } catch (error) {
      console.error('Fund wallet error:', error);
      res.status(500).json({ error: 'Failed to fund wallet' });
    }
  }

  static async verifyUser(req, res) {
    try {
      const userId = req.user.id;
      const updated = await User.updateVerificationStatus(userId, 'verified');

      if (updated) {
        res.json({ message: 'User verification status updated' });
      } else {
        res.status(400).json({ error: 'Failed to update verification status' });
      }
    } catch (error) {
      console.error('Verify user error:', error);
      res.status(500).json({ error: 'Failed to verify user' });
    }
  }
}

module.exports = AuthController;