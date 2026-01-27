const { ethers, network } = require('hardhat');
const dotenv = require('dotenv');

// Load env files
dotenv.config({ path: '.env.local' });
dotenv.config();

async function main() {
  const USDC_ADDRESS = process.env.USDC_ADDRESS?.trim() || '0x3600000000000000000000000000000000000000';
  const FEE_COLLECTOR = '0xAE80D683b366e144DFdDD7e2D9667414F689CD9f';

  console.log("Deploying V5 yield escrow factory to", network.name, "...");
  console.log("USDC Address:", USDC_ADDRESS);
  console.log("FeeCollector:", FEE_COLLECTOR);

  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error('No signers found. Check DEPLOYER_PRIVATE_KEY in .env.local');
  }
  const deployer = signers[0];
  console.log("Deployer:", deployer.address);

  // Deploy MockUSYC for testnet only (3.8% APY)
  let usycAddress: string;
  const isTestnet = network.name !== 'mainnet' && network.name !== 'arc-mainnet';

  if (isTestnet) {
    console.log("\nDeploying MockUSYC for testnet (3.8% APY)...");
    const MockUSYC = await ethers.getContractFactory("MockUSYC");
    const usyc = await MockUSYC.deploy(USDC_ADDRESS, 380); // 3.8% APY
    await usyc.waitForDeployment();
    usycAddress = await usyc.getAddress();
    console.log("MockUSYC deployed to:", usycAddress);
  } else {
    // On mainnet, use real USYC address (to be provided)
    throw new Error("Mainnet USYC address not configured. Please provide real USYC address.");
  }

  // Deploy ArcYieldEscrowFactory
  console.log("\nDeploying ArcYieldEscrowFactory...");
  const Factory = await ethers.getContractFactory("ArcYieldEscrowFactory");
  const factory = await Factory.deploy(USDC_ADDRESS, usycAddress, FEE_COLLECTOR);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("ArcYieldEscrowFactory deployed to:", factoryAddress);

  // Summary
  console.log("\n========================================");
  console.log("V5 Yield Escrow Deployment Complete!");
  console.log("========================================");
  console.log("YieldEscrowFactory:", factoryAddress);
  console.log("USYC:", usycAddress);
  console.log("FeeCollector (reused):", FEE_COLLECTOR);
  console.log("USDC:", USDC_ADDRESS);
  console.log("========================================");

  // Output for addresses.ts
  console.log("\nUpdate lib/contracts/addresses.ts:");
  console.log(`  YIELD_ESCROW_FACTORY: '${factoryAddress}' as const,`);
  if (isTestnet) {
    console.log(`  MOCK_USYC: '${usycAddress}' as const,`);
  }

  // Verification commands
  console.log("\nVerify with:");
  if (isTestnet) {
    console.log(`npx hardhat verify --network ${network.name} ${usycAddress} ${USDC_ADDRESS} 380`);
  }
  console.log(`npx hardhat verify --network ${network.name} ${factoryAddress} ${USDC_ADDRESS} ${usycAddress} ${FEE_COLLECTOR}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
