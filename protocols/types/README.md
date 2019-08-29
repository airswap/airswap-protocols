# Types

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens. This repository contains a library of Swap Protocol types.

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

| Contract | Package                              | Version | Network | Address                                                                                                                         |
| :------- | :----------------------------------- | :------ | :------ | :------------------------------------------------------------------------------------------------------------------------------ |
| Types    | [`@airswap/types`](/protocols/types) | `0.1.0` | Mainnet | [`0xc65ff60eb8e4038a2415bb569d1fa6dca47d692e`](https://etherscan.io/address/0xc65ff60eb8e4038a2415bb569d1fa6dca47d692e)         |
| Types    | [`@airswap/types`](/protocols/types) | `0.1.0` | Rinkeby | [`0xAaf6cB19298e7d0abc410Eb2A0D5B8fEf747573D`](https://rinkeby.etherscan.io/address/0xaaf6cb19298e7d0abc410eb2a0d5b8fef747573d) |

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
