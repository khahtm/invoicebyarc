const { expect } = require('chai');
const { ethers } = require('hardhat');
const { time } = require('@nomicfoundation/hardhat-network-helpers');

describe('ArcYieldEscrow', function () {
  let usdc: any;
  let usyc: any;
  let feeCollector: any;
  let factory: any;
  let creator: any;
  let payer: any;

  const INVOICE_AMOUNT = ethers.parseUnits('1000', 6); // 1000 USDC
  const AUTO_RELEASE_DAYS = 30;

  beforeEach(async function () {
    [creator, payer] = await ethers.getSigners();

    // Deploy MockERC20 as USDC
    const MockERC20 = await ethers.getContractFactory('MockERC20');
    usdc = await MockERC20.deploy('USD Coin', 'USDC', 6);

    // Deploy MockUSYC with 5% APY
    const MockUSYC = await ethers.getContractFactory('MockUSYC');
    usyc = await MockUSYC.deploy(await usdc.getAddress(), 500);

    // Seed MockUSYC vault with USDC so redeems work
    await usdc.mint(await usyc.getAddress(), ethers.parseUnits('1000', 6));

    // Deploy FeeCollector
    const FeeCollector = await ethers.getContractFactory('FeeCollector');
    feeCollector = await FeeCollector.deploy(await usdc.getAddress());

    // Deploy ArcYieldEscrowFactory
    const Factory = await ethers.getContractFactory('ArcYieldEscrowFactory');
    factory = await Factory.deploy(
      await usdc.getAddress(),
      await usyc.getAddress(),
      await feeCollector.getAddress()
    );

    // Mint USDC to payer
    await usdc.mint(payer.address, ethers.parseUnits('10000', 6));
  });

  describe('MockUSYC', function () {
    it('should deploy with correct initial state', async function () {
      expect(await usyc.yieldRateAPY()).to.equal(500);
      expect(await usyc.totalAssets()).to.equal(ethers.parseUnits('1001000', 6));
      expect(await usyc.totalSupply()).to.equal(ethers.parseUnits('1000', 6));
    });

    it('should deposit USDC and mint shares', async function () {
      const depositAmount = ethers.parseUnits('100', 6);
      await usdc.mint(creator.address, depositAmount);
      await usdc.connect(creator).approve(await usyc.getAddress(), depositAmount);

      const sharesBefore = await usyc.balanceOf(creator.address);
      await usyc.connect(creator).deposit(depositAmount, creator.address);
      const sharesAfter = await usyc.balanceOf(creator.address);

      expect(sharesAfter).to.be.gt(sharesBefore);
    });

    it('should accrue yield over time', async function () {
      const depositAmount = ethers.parseUnits('1000', 6);
      await usdc.mint(creator.address, depositAmount);
      await usdc.connect(creator).approve(await usyc.getAddress(), depositAmount);

      await usyc.connect(creator).deposit(depositAmount, creator.address);
      const shareBalance = await usyc.balanceOf(creator.address);
      const valueBefore = await usyc.convertToAssets(shareBalance);

      // Fast forward 365 days
      await time.increase(365 * 24 * 60 * 60);
      await usyc.accrueYield();

      const valueAfter = await usyc.convertToAssets(shareBalance);
      const expectedIncrease = (depositAmount * 5n) / 100n; // ~5% yield

      expect(valueAfter).to.be.closeTo(valueBefore + expectedIncrease, 100);
    });

    it('should redeem shares for USDC', async function () {
      const depositAmount = ethers.parseUnits('1000', 6);
      await usdc.mint(creator.address, depositAmount);
      await usdc.connect(creator).approve(await usyc.getAddress(), depositAmount);

      await usyc.connect(creator).deposit(depositAmount, creator.address);
      const shareBalance = await usyc.balanceOf(creator.address);

      const usdcBefore = await usdc.balanceOf(creator.address);
      await usyc.connect(creator).redeem(shareBalance, creator.address, creator.address);
      const usdcAfter = await usdc.balanceOf(creator.address);

      expect(usdcAfter - usdcBefore).to.be.closeTo(depositAmount, 100);
    });

    it('should update yield rate (onlyOwner)', async function () {
      await usyc.setYieldRate(800);
      expect(await usyc.yieldRateAPY()).to.equal(800);

      await expect(
        usyc.connect(payer).setYieldRate(1000)
      ).to.be.revertedWithCustomError(usyc, 'OwnableUnauthorizedAccount');
    });
  });

  describe('ArcYieldEscrow', function () {
    let escrow: any;
    const invoiceId = ethers.id('invoice-001');

    beforeEach(async function () {
      await factory.createEscrow(invoiceId, INVOICE_AMOUNT, AUTO_RELEASE_DAYS);
      const escrowAddress = await factory.getEscrow(invoiceId);
      escrow = await ethers.getContractAt('ArcYieldEscrow', escrowAddress);
    });

    it('should deploy with correct state', async function () {
      expect(await escrow.creator()).to.equal(creator.address);
      expect(await escrow.state()).to.equal(0); // CREATED
      expect(await escrow.autoReleaseDays()).to.equal(AUTO_RELEASE_DAYS);
    });

    it('should deposit USDC and convert to USYC', async function () {
      const payerTotal = await feeCollector.calculatePayerAmount(INVOICE_AMOUNT);
      await usdc.connect(payer).approve(await escrow.getAddress(), payerTotal);
      await escrow.connect(payer).deposit(INVOICE_AMOUNT);

      expect(await escrow.payer()).to.equal(payer.address);
      expect(await escrow.state()).to.equal(1); // FUNDED
      expect(await escrow.originalUsdcAmount()).to.be.gt(0);
      expect(await escrow.depositedUsycShares()).to.be.gt(0);
    });

    it('should release with yield to creator', async function () {
      // Deposit
      const payerTotal = await feeCollector.calculatePayerAmount(INVOICE_AMOUNT);
      await usdc.connect(payer).approve(await escrow.getAddress(), payerTotal);
      await escrow.connect(payer).deposit(INVOICE_AMOUNT);

      // Wait 30 days and accrue yield
      await time.increase(30 * 24 * 60 * 60);
      await usyc.accrueYield();

      const creatorBalanceBefore = await usdc.balanceOf(creator.address);
      await escrow.connect(payer).release();

      const creatorBalanceAfter = await usdc.balanceOf(creator.address);
      const received = creatorBalanceAfter - creatorBalanceBefore;

      expect(await escrow.state()).to.equal(2); // RELEASED
      expect(received).to.be.gt(await escrow.originalUsdcAmount());
    });

    it('should refund to payer with yield', async function () {
      // Deposit
      const payerTotal = await feeCollector.calculatePayerAmount(INVOICE_AMOUNT);
      await usdc.connect(payer).approve(await escrow.getAddress(), payerTotal);
      await escrow.connect(payer).deposit(INVOICE_AMOUNT);

      // Wait 30 days and accrue yield
      await time.increase(30 * 24 * 60 * 60);
      await usyc.accrueYield();

      const payerBalanceBefore = await usdc.balanceOf(payer.address);
      await escrow.connect(creator).refund();

      const payerBalanceAfter = await usdc.balanceOf(payer.address);
      const received = payerBalanceAfter - payerBalanceBefore;

      expect(await escrow.state()).to.equal(3); // REFUNDED
      expect(received).to.be.gt(await escrow.originalUsdcAmount());
    });

    it('should auto-release after timeout', async function () {
      // Deposit
      const payerTotal = await feeCollector.calculatePayerAmount(INVOICE_AMOUNT);
      await usdc.connect(payer).approve(await escrow.getAddress(), payerTotal);
      await escrow.connect(payer).deposit(INVOICE_AMOUNT);

      // Creator can't release immediately
      await expect(
        escrow.connect(creator).release()
      ).to.be.revertedWith('Not authorized');

      // Fast forward past auto-release period
      await time.increase(AUTO_RELEASE_DAYS * 24 * 60 * 60);

      // Creator CAN release now
      await escrow.connect(creator).release();
      expect(await escrow.state()).to.equal(2); // RELEASED
    });

    it('should revert unauthorized refund', async function () {
      // Deposit
      const payerTotal = await feeCollector.calculatePayerAmount(INVOICE_AMOUNT);
      await usdc.connect(payer).approve(await escrow.getAddress(), payerTotal);
      await escrow.connect(payer).deposit(INVOICE_AMOUNT);

      // Payer can't refund
      await expect(
        escrow.connect(payer).refund()
      ).to.be.revertedWith('Only creator');
    });

    it('should revert double deposit', async function () {
      const payerTotal = await feeCollector.calculatePayerAmount(INVOICE_AMOUNT);
      await usdc.connect(payer).approve(await escrow.getAddress(), payerTotal * 2n);
      await escrow.connect(payer).deposit(INVOICE_AMOUNT);

      await expect(
        escrow.connect(payer).deposit(INVOICE_AMOUNT)
      ).to.be.revertedWith('Invalid state');
    });

    it('should return correct getCurrentValue and getAccruedYield', async function () {
      // Deposit
      const payerTotal = await feeCollector.calculatePayerAmount(INVOICE_AMOUNT);
      await usdc.connect(payer).approve(await escrow.getAddress(), payerTotal);
      await escrow.connect(payer).deposit(INVOICE_AMOUNT);

      const originalAmount = await escrow.originalUsdcAmount();
      const valueBefore = await escrow.getCurrentValue();
      expect(valueBefore).to.be.closeTo(originalAmount, 100);

      // Wait 30 days and accrue yield
      await time.increase(30 * 24 * 60 * 60);
      await usyc.accrueYield();

      const valueAfter = await escrow.getCurrentValue();
      const yieldAccrued = await escrow.getAccruedYield();

      expect(valueAfter).to.be.gt(valueBefore);
      expect(yieldAccrued).to.be.gt(0);
      expect(yieldAccrued).to.equal(valueAfter - originalAmount);
    });
  });

  describe('ArcYieldEscrowFactory', function () {
    it('should create escrow and emit EscrowCreated event', async function () {
      const invoiceId = ethers.id('invoice-001');

      await expect(
        factory.createEscrow(invoiceId, INVOICE_AMOUNT, AUTO_RELEASE_DAYS)
      ).to.emit(factory, 'EscrowCreated');

      const escrowAddress = await factory.getEscrow(invoiceId);
      expect(escrowAddress).to.not.equal(ethers.ZeroAddress);
    });

    it('should prevent duplicate invoiceId', async function () {
      const invoiceId = ethers.id('invoice-001');

      await factory.createEscrow(invoiceId, INVOICE_AMOUNT, AUTO_RELEASE_DAYS);

      await expect(
        factory.createEscrow(invoiceId, INVOICE_AMOUNT, AUTO_RELEASE_DAYS)
      ).to.be.revertedWith('Escrow already exists for invoice');
    });

    it('should track escrows', async function () {
      expect(await factory.getEscrowCount()).to.equal(0);

      await factory.createEscrow(ethers.id('invoice-001'), INVOICE_AMOUNT, AUTO_RELEASE_DAYS);
      expect(await factory.getEscrowCount()).to.equal(1);

      await factory.createEscrow(ethers.id('invoice-002'), INVOICE_AMOUNT, AUTO_RELEASE_DAYS);
      expect(await factory.getEscrowCount()).to.equal(2);

      const firstEscrow = await factory.getEscrowByIndex(0);
      expect(firstEscrow).to.not.equal(ethers.ZeroAddress);
    });

    it('should return zero address for unknown invoiceId', async function () {
      const unknownId = ethers.id('unknown-invoice');
      const escrowAddress = await factory.getEscrow(unknownId);
      expect(escrowAddress).to.equal(ethers.ZeroAddress);
    });
  });
});
