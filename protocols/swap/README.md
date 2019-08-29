# Swap

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens. This package contains source code and tests for the atomic `Swap` used to perform trustless token transfers between parties.

[![Discord](https://img.shields.io/discord/590643190281928738.svg)](https://discord.gg/ecQbV7H)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![CircleCI](https://circleci.com/gh/airswap/airswap-protocols.svg?style=svg&circle-token=73bd6668f836ce4306dbf6ca32109ddbb5b7e1fe)](https://circleci.com/gh/airswap/airswap-protocols)
![Twitter Follow](https://img.shields.io/twitter/follow/airswap?style=social)

## Resources

- Docs → https://airswap.gitbook.io/
- Website → https://www.airswap.io/
- Blog → https://medium.com/fluidity
- Support → https://support.airswap.io/

## For V1 Users

To migrate from the V1 to V2 protocol please see [MIGRATION.md](MIGRATION.md).

## Deployments

| Contract | Version | Network | Address                                                                                                                         |
| :------- | :------ | :------ | :------------------------------------------------------------------------------------------------------------------------------ |
| Swap     | `2.1.0` | Mainnet | [`0x251F752B85a9F7e1B3C42D802715B5D7A8Da3165`](https://etherscan.io/address/0x251F752B85a9F7e1B3C42D802715B5D7A8Da3165)         |
| Swap     | `2.1.0` | Rinkeby | [`0x6f337bA064b0a92538a4AfdCF0e60F50eEAe0D5B`](https://rinkeby.etherscan.io/address/0x6f337bA064b0a92538a4AfdCF0e60F50eEAe0D5B) |

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
