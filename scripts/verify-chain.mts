/**
 * Preflight for Hood Drop. Read-only: no transactions, nothing spent.
 *
 * Run this before any funded run, and after changing any address in `.env`.
 *
 *   npx tsx --env-file=.env scripts/verify-chain.mts
 *
 * Robinhood Chain hosts several Uniswap V3 forks and multiple verified
 * contracts named "SwapRouter"/"Quoter"/"NOXA". Having bytecode proves nothing.
 * This asserts the router, quoter and pool all agree on one factory and one WETH.
 */
import { formatEther, formatUnits } from "viem";

import { getPoolFeeTier, getRpcUrl, isDryRun } from "../lib/evm/chain";
import { treasuryReport } from "../lib/evm/buyback";
import { getRouterAllowance, quoteWethToToken, applySlippage } from "../lib/evm/noxa";
import { getEthUsdPrice, usdToWei } from "../lib/evm/price";
import { verifyChain } from "../lib/evm/verify";

const ok = (m: string) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const info = (m: string) => console.log(`    ${m}`);

async function main() {
  console.log(`\nHood Drop preflight — ${getRpcUrl()}\n`);

  console.log("Chain wiring");
  const c = await verifyChain();
  ok(`chain id ${c.chainId}`);
  ok(`WETH ${c.weth}`);
  ok(`router ${c.router} — factory() and WETH9() match`);
  ok(`quoter ${c.quoter} — factory() matches`);
  ok(`token ${c.token} (${c.tokenSymbol}, ${c.tokenDecimals} decimals)`);
  ok(`pool ${c.pool} @ ${getPoolFeeTier() / 10_000}% — liquidity ${c.poolLiquidity}`);

  console.log("\nPrice feed");
  const price = await getEthUsdPrice();
  ok(`Chainlink ETH/USD = $${price.toFixed(2)}`);

  console.log("\nTreasury");
  const t = await treasuryReport();
  ok(`address ${t.address}`);
  const ethOk = t.eth > 0n;
  const wethOk = t.weth > 0n;
  console.log(`  ${ethOk ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"} native ETH (gas)  ${formatEther(t.eth)}`);
  console.log(`  ${wethOk ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"} WETH (buys)       ${formatEther(t.weth)}`);
  if (!ethOk) info("fund with native ETH or every drop fails on gas");
  if (!wethOk) info("wrap ETH into WETH or every swap reverts");

  const allowance = await getRouterAllowance();
  ok(`router WETH allowance ${allowance === 0n ? "0 (will approve on first drop)" : "set"}`);

  console.log("\nQuote check ($1 drop)");
  const amountIn = await usdToWei(1);
  const quoted = await quoteWethToToken(amountIn);
  const minOut = applySlippage(quoted);
  ok(`$1 = ${formatEther(amountIn)} WETH`);
  ok(`quoted out ${formatUnits(quoted, c.tokenDecimals)} ${c.tokenSymbol}`);
  ok(`amountOutMinimum ${formatUnits(minOut, c.tokenDecimals)} (never 0)`);

  console.log(`\n\x1b[32mAll checks passed.\x1b[0m${isDryRun() ? " (DRY_RUN=1 — drops will simulate only)" : ""}\n`);
}

main().catch((e) => {
  console.error(`\n\x1b[31m✗ preflight failed:\x1b[0m ${(e as Error).message}\n`);
  process.exit(1);
});
