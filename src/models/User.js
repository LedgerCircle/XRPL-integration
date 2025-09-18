const bcrypt = require('bcryptjs');
const database = require('../database/database');
const xrplService = require('../utils/xrpl');

class User {
  static async create(userData) {
    const db = database.getDb();
    const { username, email, password } = userData;

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create XRPL wallet
    const wallet = xrplService.createWallet();

    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO users (username, email, password_hash, xrpl_address, xrpl_seed)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run([username, email, passwordHash, wallet.address, wallet.seed], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            username,
            email,
            xrpl_address: wallet.address,
            verification_status: 'pending'
          });
        }
      });

      stmt.finalize();
    });
  }

  static async findById(id) {
    const db = database.getDb();
    
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT id, username, email, xrpl_address, verification_status, created_at FROM users WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  static async findByUsername(username) {
    const db = database.getDb();
    
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE username = ?',
        [username],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  static async findByEmail(email) {
    const db = database.getDb();
    
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE email = ?',
        [email],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  static async verifyPassword(user, password) {
    return bcrypt.compare(password, user.password_hash);
  }

  static async updateVerificationStatus(userId, status) {
    const db = database.getDb();
    
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET verification_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, userId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  static async getWalletSeed(userId) {
    const db = database.getDb();
    
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT xrpl_seed FROM users WHERE id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row?.xrpl_seed);
        }
      );
    });
  }

  static async fundTestnetWallet(userId) {
    try {
      const user = await this.findById(userId);
      if (!user) throw new Error('User not found');

      const funded = await xrplService.fundTestnetAccount(user.xrpl_address);
      if (funded) {
        await this.updateVerificationStatus(userId, 'verified');
      }
      
      return funded;
    } catch (error) {
      console.error('Failed to fund testnet wallet:', error);
      return false;
    }
  }

  static async getBalance(userId) {
    try {
      const user = await this.findById(userId);
      if (!user) throw new Error('User not found');

      return await xrplService.getBalance(user.xrpl_address);
    } catch (error) {
      console.error('Failed to get balance:', error);
      return '0';
    }
  }

  static async getAllUsers(limit = 50, offset = 0) {
    const db = database.getDb();
    
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT id, username, email, xrpl_address, verification_status, created_at 
         FROM users 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }
}

module.exports = User;