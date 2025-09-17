const LendingCircle = require('../models/LendingCircle');
const User = require('../models/User');

class CircleController {
  static async createCircle(req, res) {
    try {
      const adminId = req.user.id;
      const circle = await LendingCircle.create(req.body, adminId);

      res.status(201).json({
        message: 'Lending circle created successfully',
        circle
      });
    } catch (error) {
      console.error('Create circle error:', error);
      res.status(500).json({ error: 'Failed to create lending circle' });
    }
  }

  static async getCircle(req, res) {
    try {
      const { id } = req.params;
      const circle = await LendingCircle.findById(id);

      if (!circle) {
        return res.status(404).json({ error: 'Circle not found' });
      }

      const members = await LendingCircle.getMembers(id);
      const memberCount = await LendingCircle.getMemberCount(id);

      res.json({
        circle,
        members,
        member_count: memberCount
      });
    } catch (error) {
      console.error('Get circle error:', error);
      res.status(500).json({ error: 'Failed to get circle details' });
    }
  }

  static async getUserCircles(req, res) {
    try {
      const userId = req.user.id;
      const circles = await LendingCircle.getCirclesByUser(userId);

      res.json({ circles });
    } catch (error) {
      console.error('Get user circles error:', error);
      res.status(500).json({ error: 'Failed to get user circles' });
    }
  }

  static async getAllCircles(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      
      const circles = await LendingCircle.getAllCircles(limit, offset);

      res.json({ circles });
    } catch (error) {
      console.error('Get all circles error:', error);
      res.status(500).json({ error: 'Failed to get circles' });
    }
  }

  static async joinCircle(req, res) {
    try {
      const { circleId } = req.body;
      const userId = req.user.id;

      const membership = await LendingCircle.joinCircle(circleId, userId);

      res.status(201).json({
        message: 'Successfully joined circle',
        membership
      });
    } catch (error) {
      console.error('Join circle error:', error);
      if (error.message.includes('full') || error.message.includes('already a member')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to join circle' });
      }
    }
  }

  static async setupMultiSignature(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check if user is admin of the circle
      const circle = await LendingCircle.findById(id);
      if (!circle) {
        return res.status(404).json({ error: 'Circle not found' });
      }

      if (circle.admin_id !== userId) {
        return res.status(403).json({ error: 'Only circle admin can setup multi-signature' });
      }

      const result = await LendingCircle.setupMultiSignature(id);

      if (result.success) {
        res.json({
          message: 'Multi-signature setup successful',
          transaction_hash: result.transactionHash
        });
      } else {
        res.status(400).json({ error: 'Failed to setup multi-signature' });
      }
    } catch (error) {
      console.error('Setup multi-signature error:', error);
      res.status(500).json({ error: error.message || 'Failed to setup multi-signature' });
    }
  }

  static async recordContribution(req, res) {
    try {
      const { circleId, amount, transactionHash } = req.body;
      const userId = req.user.id;

      // Get member info
      const member = await LendingCircle.getMemberByUserAndCircle(circleId, userId);
      if (!member) {
        return res.status(400).json({ error: 'User is not a member of this circle' });
      }

      const contribution = await LendingCircle.recordContribution(
        circleId,
        member.id,
        amount,
        transactionHash
      );

      res.status(201).json({
        message: 'Contribution recorded successfully',
        contribution
      });
    } catch (error) {
      console.error('Record contribution error:', error);
      res.status(500).json({ error: 'Failed to record contribution' });
    }
  }

  static async getCircleMembers(req, res) {
    try {
      const { id } = req.params;
      const members = await LendingCircle.getMembers(id);

      res.json({ members });
    } catch (error) {
      console.error('Get circle members error:', error);
      res.status(500).json({ error: 'Failed to get circle members' });
    }
  }

  static async calculateInterest(req, res) {
    try {
      const { amount, rate, periodDays } = req.query;
      
      if (!amount || !rate || !periodDays) {
        return res.status(400).json({ 
          error: 'Missing required parameters: amount, rate, periodDays' 
        });
      }

      const interest = await LendingCircle.calculateInterest(
        parseFloat(amount),
        parseFloat(rate),
        parseInt(periodDays)
      );

      res.json({
        principal: parseFloat(amount),
        rate: parseFloat(rate),
        period_days: parseInt(periodDays),
        interest_amount: interest,
        total_amount: parseFloat(amount) + interest
      });
    } catch (error) {
      console.error('Calculate interest error:', error);
      res.status(500).json({ error: 'Failed to calculate interest' });
    }
  }

  static async updateCircleStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user.id;

      // Check if user is admin of the circle
      const circle = await LendingCircle.findById(id);
      if (!circle) {
        return res.status(404).json({ error: 'Circle not found' });
      }

      if (circle.admin_id !== userId) {
        return res.status(403).json({ error: 'Only circle admin can update status' });
      }

      const updated = await LendingCircle.updateStatus(id, status);

      if (updated) {
        res.json({ message: 'Circle status updated successfully' });
      } else {
        res.status(400).json({ error: 'Failed to update circle status' });
      }
    } catch (error) {
      console.error('Update circle status error:', error);
      res.status(500).json({ error: 'Failed to update circle status' });
    }
  }
}

module.exports = CircleController;