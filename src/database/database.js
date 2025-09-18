const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    this.db = null;
  }

  async initialize() {
    const dbDir = path.dirname(process.env.DB_PATH || './data/ledgerloop.db');
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(process.env.DB_PATH || './data/ledgerloop.db', (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        xrpl_address VARCHAR(34),
        xrpl_seed VARCHAR(255),
        verification_status VARCHAR(20) DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Lending Circles table
      `CREATE TABLE IF NOT EXISTS lending_circles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        admin_id INTEGER NOT NULL,
        max_members INTEGER DEFAULT 10,
        contribution_amount DECIMAL(20,6) NOT NULL,
        contribution_frequency VARCHAR(20) NOT NULL,
        interest_rate DECIMAL(5,4) DEFAULT 0.0000,
        status VARCHAR(20) DEFAULT 'active',
        multisig_address VARCHAR(34),
        multisig_signers TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES users(id)
      )`,

      // Circle Members table
      `CREATE TABLE IF NOT EXISTS circle_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        circle_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active',
        contribution_order INTEGER,
        last_contribution_date DATETIME,
        total_contributed DECIMAL(20,6) DEFAULT 0,
        loan_received DECIMAL(20,6) DEFAULT 0,
        FOREIGN KEY (circle_id) REFERENCES lending_circles(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(circle_id, user_id)
      )`,

      // Contributions table
      `CREATE TABLE IF NOT EXISTS contributions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        circle_id INTEGER NOT NULL,
        member_id INTEGER NOT NULL,
        amount DECIMAL(20,6) NOT NULL,
        transaction_hash VARCHAR(64),
        transaction_status VARCHAR(20) DEFAULT 'pending',
        contribution_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (circle_id) REFERENCES lending_circles(id),
        FOREIGN KEY (member_id) REFERENCES circle_members(id)
      )`,

      // Loans table
      `CREATE TABLE IF NOT EXISTS loans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        circle_id INTEGER NOT NULL,
        borrower_id INTEGER NOT NULL,
        amount DECIMAL(20,6) NOT NULL,
        interest_amount DECIMAL(20,6) DEFAULT 0,
        escrow_address VARCHAR(34),
        escrow_transaction_hash VARCHAR(64),
        status VARCHAR(20) DEFAULT 'pending',
        disbursement_date DATETIME,
        due_date DATETIME,
        repayment_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (circle_id) REFERENCES lending_circles(id),
        FOREIGN KEY (borrower_id) REFERENCES circle_members(id)
      )`,

      // Transactions table for monitoring
      `CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_hash VARCHAR(64) UNIQUE NOT NULL,
        from_address VARCHAR(34),
        to_address VARCHAR(34),
        amount DECIMAL(20,6),
        transaction_type VARCHAR(50),
        status VARCHAR(20) DEFAULT 'pending',
        circle_id INTEGER,
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        confirmed_at DATETIME,
        FOREIGN KEY (circle_id) REFERENCES lending_circles(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`
    ];

    for (const table of tables) {
      await new Promise((resolve, reject) => {
        this.db.run(table, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    console.log('Database tables created successfully');
  }

  getDb() {
    return this.db;
  }

  async close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) console.error('Error closing database:', err);
          else console.log('Database connection closed');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = new Database();