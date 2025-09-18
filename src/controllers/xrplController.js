const xrplService = require('../utils/xrpl');
const User = require('../models/User');
const database = require('../database/database');

class XRPLController {
  static async validateAddress(req, res) {
    try {
      const { address } = req.body;
      const isValid = xrplService.isValidAddress(address);

      res.json({
        address,
        is_valid: isValid
      });
    } catch (error) {
      console.error('Address validation error:', error);
      res.status(500).json({ error: 'Failed to validate address' });
    }
  }

  static async getAccountInfo(req, res) {
    try {
      const { address } = req.params;
      
      if (!xrplService.isValidAddress(address)) {
        return res.status(400).json({ error: 'Invalid XRPL address' });
      }

      const accountInfo = await xrplService.getAccountInfo(address);
      const balance = await xrplService.getBalance(address);

      if (!accountInfo) {
        return res.json({
          address,
          exists: false,
          balance: '0'
        });
      }

      res.json({
        address,
        exists: true,
        balance,
        account_info: accountInfo
      });
    } catch (error) {
      console.error('Get account info error:', error);
      res.status(500).json({ error: 'Failed to get account information' });
    }
  }

  static async getTransactionHistory(req, res) {
    try {
      const { address } = req.params;
      const limit = parseInt(req.query.limit) || 20;
      
      if (!xrplService.isValidAddress(address)) {
        return res.status(400).json({ error: 'Invalid XRPL address' });
      }

      const transactions = await xrplService.getAccountTransactions(address, limit);

      res.json({
        address,
        transactions
      });
    } catch (error) {
      console.error('Get transaction history error:', error);
      res.status(500).json({ error: 'Failed to get transaction history' });
    }
  }

  static async createEscrow(req, res) {
    try {
      const { destination, amount, finishAfter, condition } = req.body;
      const userId = req.user.id;

      // Get user's wallet
      const userSeed = await User.getWalletSeed(userId);
      if (!userSeed) {
        return res.status(400).json({ error: 'User wallet not found' });
      }

      const senderWallet = xrplService.walletFromSeed(userSeed);

      // Create escrow
      const result = await xrplService.createEscrow(
        senderWallet,
        destination,
        amount,
        finishAfter,
        condition
      );

      if (result.success) {
        // Record transaction in database
        await this.recordTransaction(
          result.transactionHash,
          senderWallet.address,
          destination,
          amount,
          'escrow_create',
          'confirmed',
          null,
          userId
        );

        res.json({
          message: 'Escrow created successfully',
          transaction_hash: result.transactionHash,
          escrow_sequence: result.escrowSequence
        });
      } else {
        res.status(400).json({ error: 'Failed to create escrow' });
      }
    } catch (error) {
      console.error('Create escrow error:', error);
      res.status(500).json({ error: 'Failed to create escrow' });
    }
  }

  static async finishEscrow(req, res) {
    try {
      const { escrowOwner, escrowSequence, fulfillment } = req.body;
      const userId = req.user.id;

      // Get user's wallet
      const userSeed = await User.getWalletSeed(userId);
      if (!userSeed) {
        return res.status(400).json({ error: 'User wallet not found' });
      }

      const finisherWallet = xrplService.walletFromSeed(userSeed);

      // Finish escrow
      const result = await xrplService.finishEscrow(
        finisherWallet,
        escrowOwner,
        escrowSequence,
        fulfillment
      );

      if (result.success) {
        // Record transaction in database
        await this.recordTransaction(
          result.transactionHash,
          finisherWallet.address,
          escrowOwner,
          0, // Amount not available in finish escrow
          'escrow_finish',
          'confirmed',
          null,
          userId
        );

        res.json({
          message: 'Escrow finished successfully',
          transaction_hash: result.transactionHash
        });
      } else {
        res.status(400).json({ error: 'Failed to finish escrow' });
      }
    } catch (error) {
      console.error('Finish escrow error:', error);
      res.status(500).json({ error: 'Failed to finish escrow' });
    }
  }

  static async sendPayment(req, res) {
    try {
      const { destination, amount, memo } = req.body;
      const userId = req.user.id;

      // Get user's wallet
      const userSeed = await User.getWalletSeed(userId);
      if (!userSeed) {
        return res.status(400).json({ error: 'User wallet not found' });
      }

      const senderWallet = xrplService.walletFromSeed(userSeed);

      // Send payment
      const result = await xrplService.sendPayment(
        senderWallet,
        destination,
        amount,
        memo
      );

      if (result.success) {
        // Record transaction in database
        await this.recordTransaction(
          result.transactionHash,
          senderWallet.address,
          destination,
          amount,
          'payment',
          'confirmed',
          null,
          userId
        );

        res.json({
          message: 'Payment sent successfully',
          transaction_hash: result.transactionHash
        });
      } else {
        res.status(400).json({ error: 'Failed to send payment' });
      }
    } catch (error) {
      console.error('Send payment error:', error);
      res.status(500).json({ error: 'Failed to send payment' });
    }
  }

  static async getStoredTransactions(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const userId = req.query.user_id ? parseInt(req.query.user_id) : null;
      const circleId = req.query.circle_id ? parseInt(req.query.circle_id) : null;

      const db = database.getDb();
      let query = `
        SELECT t.*, u.username, lc.name as circle_name
        FROM transactions t
        LEFT JOIN users u ON t.user_id = u.id
        LEFT JOIN lending_circles lc ON t.circle_id = lc.id
        WHERE 1=1
      `;
      const params = [];

      if (userId) {
        query += ' AND t.user_id = ?';
        params.push(userId);
      }

      if (circleId) {
        query += ' AND t.circle_id = ?';
        params.push(circleId);
      }

      query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const transactions = await new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      res.json({ transactions });
    } catch (error) {
      console.error('Get stored transactions error:', error);
      res.status(500).json({ error: 'Failed to get transactions' });
    }
  }

  static async recordTransaction(hash, fromAddress, toAddress, amount, type, status, circleId, userId) {
    const db = database.getDb();
    
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO transactions (transaction_hash, from_address, to_address, amount, transaction_type, status, circle_id, user_id, confirmed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      stmt.run([hash, fromAddress, toAddress, amount, type, status, circleId, userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });

      stmt.finalize();
    });
  }

  static async subscribeToAddressUpdates(req, res) {
    try {
      const { address } = req.body;
      
      if (!xrplService.isValidAddress(address)) {
        return res.status(400).json({ error: 'Invalid XRPL address' });
      }

      // In a real application, you would store this subscription in the database
      // and have a background service monitoring the address
      await xrplService.subscribeToAccount(address, (transaction) => {
        console.log(`New transaction for ${address}:`, transaction);
        // Here you would typically emit to WebSocket clients or store in database
      });

      res.json({
        message: `Subscribed to updates for address: ${address}`
      });
    } catch (error) {
      console.error('Subscribe to address error:', error);
      res.status(500).json({ error: 'Failed to subscribe to address updates' });
    }
  }
}

module.exports = XRPLController;