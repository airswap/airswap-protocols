# Locker

:warning: This package deprecated in favor of [@airswap/staking](../staking).

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens.

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

:warning: This package is under active development and contains unaudited code. For all AirSwap contract deployments see [Deployed Contracts](https://docs.airswap.io/system/contract-deployments).

## Commands

| Command        | Description                             |
| :------------- | :-------------------------------------- |
| `yarn`         | Install dependencies                    |
| `yarn clean`   | Delete the contract `build` folder      |
| `yarn compile` | Compile all contracts to `build` folder |
| `yarn test`    | Run all contract tests in `test` folder |

## Running Tests

:bulb: Prior to testing locally, run `yarn compile` in the `airswap-protocols` project root to build required artifacts. Also in root, run `yarn ganache` before running `yarn test` in another shell.
