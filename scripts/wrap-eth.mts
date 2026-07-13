/**
 * Wrap native ETH into WETH in the treasury wallet.
 *
 * The V3 pool is WETH-paired, so the treasury must hold WETH to swap. It must
 * ALSO keep native ETH to pay gas — so this deliberately refuses to wrap the
 * whole balance and leaves a gas reserve behind.
 *
 *   npx tsx --env-file=.env.local scripts/wrap-eth.mts 0.01
 *
 * SPENDS REAL MONEY (gas). Read-only until you pass an amount.
 */
import { formatEther, parseEther } from "viem";

import { WETH_ADDRESS } from "../lib/evm/chain";
import { WETH_ABI } from "../lib/evm/abis";
import {
  getPublicClient,
  getTreasuryAccount,
  getTreasuryEthBalance,
  getTreasuryWethBalance,
  getWalletClient,
} from "../lib/evm/treasury";

/** Keep this much native ETH back for gas, no matter what. */
const GAS_RESERVE = parseEther("0.002");

async function main() {
  const account = getTreasuryAccount();
  const [eth, weth] = await Promise.all([getTreasuryEthBalance(), getTreasuryWethBalance()]);

  console.log(`\nTreasury ${account.address}`);
  console.log(`  native ETH  ${formatEther(eth)}`);
  console.log(`  WETH        ${formatEther(weth)}\n`);

  const arg = process.argv[2];
  if (!arg) {
    const spendable = eth > GAS_RESERVE ? eth - GAS_RESERVE : 0n;
    console.log(`Pass an amount in ETH to wrap, e.g.:`);
    console.log(`  npx tsx --env-file=.env.local scripts/wrap-eth.mts 0.01`);
    console.log(`\nMost you could wrap while keeping ${formatEther(GAS_RESERVE)} ETH for gas: ${formatEther(spendable)}`);
    return;
  }

  const amount = parseEther(arg as `${number}`);
  if (amount <= 0n) throw new Error(`invalid amount: ${arg}`);

  if (eth < amount + GAS_RESERVE) {
    throw new Error(
      `Refusing to wrap ${formatEther(amount)}: balance is ${formatEther(eth)} and ` +
        `${formatEther(GAS_RESERVE)} must stay behind for gas. ` +
        `Wrap at most ${formatEther(eth > GAS_RESERVE ? eth - GAS_RESERVE : 0n)}.`,
    );
  }

  console.log(`Wrapping ${formatEther(amount)} ETH -> WETH ...`);
  const wallet = getWalletClient();
  const hash = await wallet.writeContract({
    address: WETH_ADDRESS(),
    abi: WETH_ABI,
    functionName: "deposit",
    value: amount,
    account,
    chain: wallet.chain,
  });
  console.log(`  tx ${hash}`);

  const receipt = await getPublicClient().waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`wrap reverted (${hash})`);

  const [eth2, weth2] = await Promise.all([getTreasuryEthBalance(), getTreasuryWethBalance()]);
  console.log(`\n\x1b[32mWrapped.\x1b[0m`);
  console.log(`  native ETH  ${formatEther(eth2)}  (gas)`);
  console.log(`  WETH        ${formatEther(weth2)}  (buys)\n`);
}

main().catch((e) => {
  console.error(`\n\x1b[31m✗ ${(e as Error).message}\x1b[0m\n`);
  process.exit(1);
});
