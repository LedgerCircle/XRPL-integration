const xrpl = require('xrpl');

class XRPLService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) return;

    try {
      this.client = new xrpl.Client(process.env.XRPL_SERVER || 'wss://s.altnet.rippletest.net:51233');
      await this.client.connect();
      this.isConnected = true;
      console.log('Connected to XRPL testnet');
    } catch (error) {
      console.error('Failed to connect to XRPL:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
      console.log('Disconnected from XRPL');
    }
  }

  // Create a new wallet
  createWallet() {
    const wallet = xrpl.Wallet.generate();
    return {
      address: wallet.address,
      seed: wallet.seed,
      publicKey: wallet.publicKey,
      privateKey: wallet.privateKey
    };
  }

  // Validate XRPL address
  isValidAddress(address) {
    try {
      return xrpl.isValidAddress(address);
    } catch (error) {
      return false;
    }
  }

  // Get account info
  async getAccountInfo(address) {
    await this.connect();
    try {
      const response = await this.client.request({
        command: 'account_info',
        account: address
      });
      return response.result.account_data;
    } catch (error) {
      if (error.data?.error === 'actNotFound') {
        return null; // Account not found
      }
      throw error;
    }
  }

  // Get account balance
  async getBalance(address) {
    const accountInfo = await this.getAccountInfo(address);
    if (!accountInfo) return '0';
    return xrpl.dropsToXrp(accountInfo.Balance);
  }

  // Fund testnet account
  async fundTestnetAccount(address) {
    await this.connect();
    try {
      await this.client.fundWallet(null, { wallet: { address } });
      return true;
    } catch (error) {
      console.error('Failed to fund testnet account:', error);
      return false;
    }
  }

  // Create multi-signature setup
  async setupMultiSignature(masterWallet, signerEntries, quorum = 2) {
    await this.connect();
    
    try {
      // Prepare SignerListSet transaction
      const signerListSet = {
        TransactionType: 'SignerListSet',
        Account: masterWallet.address,
        SignerQuorum: quorum,
        SignerEntries: signerEntries.map((entry, index) => ({
          SignerEntry: {
            Account: entry.address,
            SignerWeight: entry.weight || 1
          }
        }))
      };

      // Sign and submit the transaction
      const prepared = await this.client.autofill(signerListSet);
      const signed = masterWallet.sign(prepared);
      const result = await this.client.submitAndWait(signed.tx_blob);

      return {
        success: result.result.meta.TransactionResult === 'tesSUCCESS',
        transactionHash: result.result.hash,
        result: result.result
      };
    } catch (error) {
      console.error('Failed to setup multi-signature:', error);
      throw error;
    }
  }

  // Create escrow
  async createEscrow(senderWallet, destination, amount, finishAfter, condition = null) {
    await this.connect();
    
    try {
      const escrowCreate = {
        TransactionType: 'EscrowCreate',
        Account: senderWallet.address,
        Destination: destination,
        Amount: xrpl.xrpToDrops(amount.toString()),
        FinishAfter: finishAfter
      };

      if (condition) {
        escrowCreate.Condition = condition;
      }

      const prepared = await this.client.autofill(escrowCreate);
      const signed = senderWallet.sign(prepared);
      const result = await this.client.submitAndWait(signed.tx_blob);

      return {
        success: result.result.meta.TransactionResult === 'tesSUCCESS',
        transactionHash: result.result.hash,
        escrowSequence: prepared.Sequence,
        result: result.result
      };
    } catch (error) {
      console.error('Failed to create escrow:', error);
      throw error;
    }
  }

  // Finish escrow
  async finishEscrow(finisherWallet, escrowOwner, escrowSequence, fulfillment = null) {
    await this.connect();
    
    try {
      const escrowFinish = {
        TransactionType: 'EscrowFinish',
        Account: finisherWallet.address,
        Owner: escrowOwner,
        OfferSequence: escrowSequence
      };

      if (fulfillment) {
        escrowFinish.Fulfillment = fulfillment;
      }

      const prepared = await this.client.autofill(escrowFinish);
      const signed = finisherWallet.sign(prepared);
      const result = await this.client.submitAndWait(signed.tx_blob);

      return {
        success: result.result.meta.TransactionResult === 'tesSUCCESS',
        transactionHash: result.result.hash,
        result: result.result
      };
    } catch (error) {
      console.error('Failed to finish escrow:', error);
      throw error;
    }
  }

  // Send XRP payment
  async sendPayment(senderWallet, destination, amount, memo = null) {
    await this.connect();
    
    try {
      const payment = {
        TransactionType: 'Payment',
        Account: senderWallet.address,
        Destination: destination,
        Amount: xrpl.xrpToDrops(amount.toString())
      };

      if (memo) {
        payment.Memos = [{
          Memo: {
            MemoData: Buffer.from(memo, 'utf8').toString('hex').toUpperCase()
          }
        }];
      }

      const prepared = await this.client.autofill(payment);
      const signed = senderWallet.sign(prepared);
      const result = await this.client.submitAndWait(signed.tx_blob);

      return {
        success: result.result.meta.TransactionResult === 'tesSUCCESS',
        transactionHash: result.result.hash,
        result: result.result
      };
    } catch (error) {
      console.error('Failed to send payment:', error);
      throw error;
    }
  }

  // Monitor account transactions
  async getAccountTransactions(address, limit = 20) {
    await this.connect();
    
    try {
      const response = await this.client.request({
        command: 'account_tx',
        account: address,
        limit: limit
      });
      return response.result.transactions;
    } catch (error) {
      console.error('Failed to get account transactions:', error);
      throw error;
    }
  }

  // Subscribe to account transactions
  async subscribeToAccount(address, callback) {
    await this.connect();
    
    try {
      await this.client.request({
        command: 'subscribe',
        accounts: [address]
      });

      this.client.on('transaction', callback);
      console.log(`Subscribed to transactions for account: ${address}`);
    } catch (error) {
      console.error('Failed to subscribe to account:', error);
      throw error;
    }
  }

  // Create wallet from seed
  walletFromSeed(seed) {
    return xrpl.Wallet.fromSeed(seed);
  }

  // Convert XRP to drops
  xrpToDrops(xrp) {
    return xrpl.xrpToDrops(xrp.toString());
  }

  // Convert drops to XRP
  dropsToXrp(drops) {
    return xrpl.dropsToXrp(drops);
  }
}

module.exports = new XRPLService();