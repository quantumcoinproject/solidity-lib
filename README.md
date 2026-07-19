# @quantumcoin/solidity-lib

Solidity libraries shared across QuantumSwap contracts on the QuantumCoin blockchain.
This package focuses on safety and execution gas efficiency.

Fork of [@uniswap/lib](https://github.com/Uniswap/uniswap-lib) (GPL-3.0-or-later), adapted for
QuantumCoin: Solidity 0.7.6 and 32-byte addresses (`AddressStringUtil`, `SafeERC20Namer`).

# Local Development

Requires `node@>=18`. Contracts are compiled with the
[`@quantumcoin/solc`](https://www.npmjs.com/package/@quantumcoin/solc) npm package
(QuantumCoin's Solidity 0.7.6 with 32-byte address support).

## Install Dependencies

`npm install`

## Compile

`npm run compile`

## Run Tests

`npm test`

Tests run against a local QuantumCoin devnet using the `quantumcoin` SDK. The devnet is
downloaded, installed, and started automatically by `scripts/devnet.js` (Windows, macOS, and
Ubuntu). Overrides: `QC_RPC_URL`, `QC_DEVNET_DIR`, `QC_KEYSTORE`, `QC_KEY_PASSWORD`.

## Usage

Install this in another project via `npm install @quantumcoin/solidity-lib`

Then import the contracts via:

```solidity
import '@quantumcoin/solidity-lib/contracts/libraries/Babylonian.sol';
```
