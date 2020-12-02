# Wrapper

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens. This package contains an example contract that wraps and unwraps ether for WETH trades in the Swap Protocol. The Wrapper contract is designed to work primarily with AirSwap Instant application [https://instant.airswap.io/tokens]. It allows consumers to send ether and receive ether while the Swap protocol handles ERC20 and ERC721 token transfers.

[![Discord](https://img.shields.io/discord/590643190281928738.svg)](https://discord.gg/ecQbV7H)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![CircleCI](https://circleci.com/gh/airswap/airswap-protocols.svg?style=svg&circle-token=73bd6668f836ce4306dbf6ca32109ddbb5b7e1fe)](https://circleci.com/gh/airswap/airswap-protocols)
![Twitter Follow](https://img.shields.io/twitter/follow/airswap?style=social)

## Resources

- Docs → https://docs.airswap.io/
- Website → https://www.airswap.io/
- Blog → https://blog.airswap.io/
- Support → https://support.airswap.io/

## Usage

:warning: This package is under active development and contains unaudited code. The audited [Wrapper](https://github.com/airswap/airswap-protocols/blob/953956f308c65ec53d1f1b20d35f47fe04b936af/source/wrapper/contracts/Wrapper.sol) contract is deployed; see [deploys.json](./deploys.json) for latest. For all AirSwap contract deployments see [Deployed Contracts](https://docs.airswap.io/system/contract-deployments).

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

:bulb: Prior to testing locally, run `yarn compile` in the `airswap-protocols` project root to build required artifacts. Then run an instance of `ganache-cli` before running `yarn test` in another shell.

```
yarn ganache
```
