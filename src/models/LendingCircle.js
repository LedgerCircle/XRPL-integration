const database = require('../database/database');
const xrplService = require('../utils/xrpl');
const User = require('./User');

class LendingCircle {
  static async create(circleData, adminId) {
    const db = database.getDb();
    const { name, description, maxMembers, contributionAmount, contributionFrequency, interestRate } = circleData;

    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO lending_circles (name, description, admin_id, max_members, contribution_amount, contribution_frequency, interest_rate)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([name, description, adminId, maxMembers, contributionAmount, contributionFrequency, interestRate], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            name,
            description,
            admin_id: adminId,
            max_members: maxMembers,
            contribution_amount: contributionAmount,
            contribution_frequency: contributionFrequency,
            interest_rate: interestRate,
            status: 'active'
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
        'SELECT * FROM lending_circles WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  static async getCirclesByUser(userId) {
    const db = database.getDb();
    
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT lc.*, cm.status as member_status, cm.contribution_order, cm.total_contributed
        FROM lending_circles lc
        LEFT JOIN circle_members cm ON lc.id = cm.circle_id
        WHERE lc.admin_id = ? OR cm.user_id = ?
        ORDER BY lc.created_at DESC
      `, [userId, userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static async joinCircle(circleId, userId) {
    const db = database.getDb();
    
    // Check if circle exists and has space
    const circle = await this.findById(circleId);
    if (!circle) throw new Error('Circle not found');

    const memberCount = await this.getMemberCount(circleId);
    if (memberCount >= circle.max_members) {
      throw new Error('Circle is full');
    }

    // Check if user is already a member
    const existingMember = await this.getMemberByUserAndCircle(circleId, userId);
    if (existingMember) {
      throw new Error('User is already a member of this circle');
    }

    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO circle_members (circle_id, user_id, contribution_order)
        VALUES (?, ?, ?)
      `);

      stmt.run([circleId, userId, memberCount + 1], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            circle_id: circleId,
            user_id: userId,
            contribution_order: memberCount + 1,
            status: 'active'
          });
        }
      });

      stmt.finalize();
    });
  }

  static async getMemberCount(circleId) {
    const db = database.getDb();
    
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM circle_members WHERE circle_id = ? AND status = "active"',
        [circleId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });
  }

  static async getMembers(circleId) {
    const db = database.getDb();
    
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT cm.*, u.username, u.email, u.xrpl_address, u.verification_status
        FROM circle_members cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.circle_id = ? AND cm.status = 'active'
        ORDER BY cm.contribution_order
      `, [circleId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static async getMemberByUserAndCircle(circleId, userId) {
    const db = database.getDb();
    
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM circle_members WHERE circle_id = ? AND user_id = ?',
        [circleId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  static async setupMultiSignature(circleId) {
    try {
      const circle = await this.findById(circleId);
      if (!circle) throw new Error('Circle not found');

      const members = await this.getMembers(circleId);
      if (members.length < 2) throw new Error('At least 2 members required for multi-signature');

      // Create signer entries for all verified members
      const signerEntries = members
        .filter(member => member.verification_status === 'verified')
        .map(member => ({
          address: member.xrpl_address,
          weight: 1
        }));

      if (signerEntries.length < 2) {
        throw new Error('At least 2 verified members required for multi-signature');
      }

      // Get admin wallet to set up multi-signature
      const adminSeed = await User.getWalletSeed(circle.admin_id);
      const adminWallet = xrplService.walletFromSeed(adminSeed);

      // Set quorum to majority of members
      const quorum = Math.ceil(signerEntries.length / 2);

      const result = await xrplService.setupMultiSignature(adminWallet, signerEntries, quorum);

      if (result.success) {
        // Update circle with multisig info
        await this.updateMultiSignature(circleId, adminWallet.address, JSON.stringify(signerEntries));
      }

      return result;
    } catch (error) {
      console.error('Failed to setup multi-signature for circle:', error);
      throw error;
    }
  }

  static async updateMultiSignature(circleId, multisigAddress, signers) {
    const db = database.getDb();
    
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE lending_circles SET multisig_address = ?, multisig_signers = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [multisigAddress, signers, circleId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  static async recordContribution(circleId, memberId, amount, transactionHash) {
    const db = database.getDb();
    
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Insert contribution record
        const contributionStmt = db.prepare(`
          INSERT INTO contributions (circle_id, member_id, amount, transaction_hash)
          VALUES (?, ?, ?, ?)
        `);

        contributionStmt.run([circleId, memberId, amount, transactionHash], function(contributionErr) {
          if (contributionErr) {
            db.run('ROLLBACK');
            reject(contributionErr);
            return;
          }

          const contributionId = this.lastID;

          // Update member's total contribution
          const memberStmt = db.prepare(`
            UPDATE circle_members 
            SET total_contributed = total_contributed + ?, last_contribution_date = CURRENT_TIMESTAMP
            WHERE id = ?
          `);

          memberStmt.run([amount, memberId], function(memberErr) {
            if (memberErr) {
              db.run('ROLLBACK');
              reject(memberErr);
            } else {
              db.run('COMMIT');
              resolve({
                id: contributionId,
                circle_id: circleId,
                member_id: memberId,
                amount,
                transaction_hash: transactionHash
              });
            }
          });

          memberStmt.finalize();
        });

        contributionStmt.finalize();
      });
    });
  }

  static async calculateInterest(amount, rate, periodDays) {
    // Simple interest calculation: P * R * T / 365
    const dailyRate = rate / 365;
    return amount * dailyRate * periodDays;
  }

  static async getAllCircles(limit = 50, offset = 0) {
    const db = database.getDb();
    
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT lc.*, u.username as admin_username,
               (SELECT COUNT(*) FROM circle_members WHERE circle_id = lc.id AND status = 'active') as member_count
        FROM lending_circles lc
        JOIN users u ON lc.admin_id = u.id
        WHERE lc.status = 'active'
        ORDER BY lc.created_at DESC
        LIMIT ? OFFSET ?
      `, [limit, offset], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static async updateStatus(circleId, status) {
    const db = database.getDb();
    
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE lending_circles SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, circleId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }
}

module.exports = LendingCircle;