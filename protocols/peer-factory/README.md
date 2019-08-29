# PeerFactory

**:warning: This package is under active development. Do not use in production.**

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens. This package contains source code and tests for a basic `PeerFactory` contract that deploys `Peer` contracts.

:bulb: **Note**: `solidity-coverage` does not cooperate with `view` functions. To run test coverage, remove the `view` keywords from functions in `PeerFactory.sol`.

[![Discord](https://img.shields.io/discord/590643190281928738.svg)](https://discord.gg/ecQbV7H)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![CircleCI](https://circleci.com/gh/airswap/airswap-protocols.svg?style=svg&circle-token=73bd6668f836ce4306dbf6ca32109ddbb5b7e1fe)](https://circleci.com/gh/airswap/airswap-protocols)
![Twitter Follow](https://img.shields.io/twitter/follow/airswap?style=social)

## Resources

- Docs → https://airswap.gitbook.io/
- Website → https://www.airswap.io/
- Blog → https://medium.com/fluidity
- Support → https://support.airswap.io/

## Deployments

| Contract    | Version | Network | Address                                                                                                                         |
| :---------- | :------ | :------ | :------------------------------------------------------------------------------------------------------------------------------ |
| PeerFactory | `0.1.0` | Rinkeby | [`0x264fD6933aa77aD558330a78f931a5f227d14B05`](https://rinkeby.etherscan.io/address/0x264fD6933aa77aD558330a78f931a5f227d14B05) |

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
