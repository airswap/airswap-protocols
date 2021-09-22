# Wrapper

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens.

[![Discord](https://img.shields.io/discord/590643190281928738.svg)](https://discord.gg/ecQbV7H)
[![License](https://img.shields.io/badge/License-MIT-blue)](https://opensource.org/licenses/MIT)
![Twitter Follow](https://img.shields.io/twitter/follow/airswap?style=social)

## Resources

- About → https://about.airswap.io/
- Website → https://www.airswap.io/
- Twitter → https://twitter.com/airswap
- Chat → https://chat.airswap.io/

## Usage

:warning: This package is under active development and contains unaudited code. For all AirSwap contract deployments see [Deployed Contracts](https://about.airswap.io/technology/deployments).

## Env Vars

Hardhat expects the following environment variables to be set. They may be set in a `.env` file.

| Variable            | Description                                |
| :------------------ | :----------------------------------------- |
| `MNEMONIC`          | 12-world account mnemonic used for testing |
| `INFURA_API_KEY`    | Infura API key to use for deployments      |
| `ETHERSCAN_API_KEY` | Etherscan API key to use for verification  |

## Commands

| Command               | Description                             |
| :-------------------- | :-------------------------------------- |
| `yarn`                | Install dependencies                    |
| `yarn clean`          | Delete the contract `build` folder      |
| `yarn compile`        | Compile all contracts to `build` folder |
| `yarn test`           | Run all tests in `test` folder          |
| `yarn test:unit`      | Run unit tests in `test` folder         |
| `yarn coverage`       | Report test coverage                    |
| `yarn deploy:rinkeby` | Deploy contracts to Rinkeby             |
| `yarn deploy:mainnet` | Deploy contracts to Mainnet             |

## Running Tests

:bulb: Prior to testing locally, run `yarn compile` in the `airswap-protocols` project root to build required artifacts.
