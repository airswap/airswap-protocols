# Wrapper

**:warning: This package has not been fully audited. Do not use in production.**


[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens. This package contains an example contract that wraps and unwraps ether for WETH trades in the Swap Protocol. The Wrapper contract is designed to work primarily with AirSwap Instant application [https://instant.airswap.io/tokens]. It allows consumers to send ether and receive ether while the Swap protocol handles ERC20 and ERC721 token transfers.

[![Discord](https://img.shields.io/discord/590643190281928738.svg)](https://discord.gg/ecQbV7H)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Commands

| Command         | Description                                   |
| :-------------- | :-------------------------------------------- |
| `yarn`          | Install dependencies                          |
| `yarn clean`    | Delete the contract `build` folder            |
| `yarn compile`  | Compile all contracts to `build` folder       |
| `yarn coverage` | Run solidity-coverage to report test coverage |
| `yarn ganache`  | Run an instance of `ganache-cli` for tests    |
| `yarn hint`     | Run a syntax linter for all Solidity code     |
| `yarn lint`     | Run a syntax linter for all JavaScript code   |
| `yarn test`     | Run all contract tests in `test` folder       |

## Running Tests

Run an instance of `ganache-cli` before running tests.

```
yarn ganache
```