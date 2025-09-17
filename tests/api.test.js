const xrplService = require('../src/utils/xrpl');

describe('XRPL Utilities', () => {
  test('should validate XRPL addresses correctly', () => {
    const validAddress = 'rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH';
    const invalidAddress = 'invalid-address';

    expect(xrplService.isValidAddress(validAddress)).toBe(true);
    expect(xrplService.isValidAddress(invalidAddress)).toBe(false);
  });

  test('should create wallet with proper structure', () => {
    const wallet = xrplService.createWallet();

    expect(wallet).toHaveProperty('address');
    expect(wallet).toHaveProperty('seed');
    expect(wallet).toHaveProperty('publicKey');
    expect(wallet).toHaveProperty('privateKey');
    expect(typeof wallet.address).toBe('string');
    expect(wallet.address).toMatch(/^r[a-zA-Z0-9]{24,34}$/);
  });

  test('should convert XRP to drops correctly', () => {
    expect(xrplService.xrpToDrops('1')).toBe('1000000');
    expect(xrplService.xrpToDrops('0.1')).toBe('100000');
    expect(xrplService.xrpToDrops('100')).toBe('100000000');
  });

  test('should convert drops to XRP correctly', () => {
    expect(xrplService.dropsToXrp('1000000')).toBe(1);
    expect(xrplService.dropsToXrp('100000')).toBe(0.1);
    expect(xrplService.dropsToXrp('100000000')).toBe(100);
  });
});

describe('Lending Circle Interest Calculation', () => {
  const LendingCircle = require('../src/models/LendingCircle');

  test('should calculate simple interest correctly', async () => {
    const principal = 1000;
    const rate = 0.05; // 5% annual
    const periodDays = 30;

    const interest = await LendingCircle.calculateInterest(principal, rate, periodDays);
    const expectedInterest = (principal * rate * periodDays) / 365;

    expect(interest).toBeCloseTo(expectedInterest, 6);
  });

  test('should handle zero interest rate', async () => {
    const principal = 1000;
    const rate = 0;
    const periodDays = 30;

    const interest = await LendingCircle.calculateInterest(principal, rate, periodDays);
    expect(interest).toBe(0);
  });
});