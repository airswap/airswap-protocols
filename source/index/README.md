# Index

**:warning: This package is under active development. Do not use in production.**

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens. This package contains source code and tests for a `Index` that represents a list of signals to trade.

[![Discord](https://img.shields.io/discord/590643190281928738.svg)](https://discord.gg/ecQbV7H)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![CircleCI](https://circleci.com/gh/airswap/airswap-protocols.svg?style=svg&circle-token=73bd6668f836ce4306dbf6ca32109ddbb5b7e1fe)](https://circleci.com/gh/airswap/airswap-protocols)
![Twitter Follow](https://img.shields.io/twitter/follow/airswap?style=social)

## Resources

- Docs → https://docs.airswap.io/
- Website → https://www.airswap.io/
- Blog → https://blog.airswap.io/
- Support → https://support.airswap.io/

## For V1 Users

To migrate from the V1 to V2 protocol please see [MIGRATION.md](MIGRATION.md).

## Deployments

| Contract | Package                            | Version | Network | Address                                                                                                                         |
| :------- | :--------------------------------- | :------ | :------ | :------------------------------------------------------------------------------------------------------------------------------ |
| Swap     | [`@airswap/swap`](/source/swap) | `2.0.0` | Mainnet | [`0x6738668f16b28589B7B9d50E79095bdeCC88d13B`](https://etherscan.io/address/0x54d2690e97e477a4b33f40d6e4afdd4832c07c57)         |
| Swap     | [`@airswap/swap`](/source/swap) | `2.0.0` | Rinkeby | [`0x6c629eAFFbEf9935F4FA390AC32f27EEC9462a8E`](https://rinkeby.etherscan.io/address/0x78db49d0459a67158bdca6e161be3d90342c7247) |

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
