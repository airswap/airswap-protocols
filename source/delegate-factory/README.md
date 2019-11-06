# DelegateFactory

**:warning: This package is under active development. Do not use in production.**

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens. This package contains source code and tests for a basic `DelegateFactory` contract that deploys `Delegate` contracts.

:bulb: **Note**: `solidity-coverage` does not cooperate with `view` functions. To run test coverage, remove the `view` keywords from functions in `DelegateFactory.sol`.

[![Discord](https://img.shields.io/discord/590643190281928738.svg)](https://discord.gg/ecQbV7H)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![CircleCI](https://circleci.com/gh/airswap/airswap-protocols.svg?style=svg&circle-token=73bd6668f836ce4306dbf6ca32109ddbb5b7e1fe)](https://circleci.com/gh/airswap/airswap-protocols)
![Twitter Follow](https://img.shields.io/twitter/follow/airswap?style=social)

## Resources

- Docs → https://docs.airswap.io/
- Website → https://www.airswap.io/
- Blog → https://blog.airswap.io/
- Support → https://support.airswap.io/

## Deploys

| Network   | Address                                      | Link                                                                                         |
| :-------- | :------------------------------------------- | :------------------------------------------------------------------------------------------- |
| `rinkeby` | `0x72D6e964816c3faAaCfD4De76A3A5B037eD6aeBa` | [Etherscan](https://rinkeby.etherscan.io/address/0x72D6e964816c3faAaCfD4De76A3A5B037eD6aeBa) |

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
