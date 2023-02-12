# Staking

[AirSwap](https://www.airswap.io/) is an open-source peer-to-peer trading network.

[![Discord](https://img.shields.io/discord/590643190281928738.svg)](https://discord.gg/ecQbV7H)
[![License](https://img.shields.io/badge/License-MIT-blue)](https://opensource.org/licenses/MIT)
![Twitter Follow](https://img.shields.io/twitter/follow/airswap?style=social)

## Resources

- About → https://about.airswap.io/
- Website → https://www.airswap.io/
- Twitter → https://twitter.com/airswap
- Chat → https://chat.airswap.io/

## Usage

:warning: This package may contain unaudited code. For all AirSwap contract deployments see [Deployed Contracts](https://about.airswap.io/technology/deployments).

## Commands

Environment variables are set in an `.env` file in the repository root.

| Command          | Description                              |
| :--------------- | :--------------------------------------- |
| `yarn`           | Install dependencies                     |
| `yarn clean`     | Delete the contract `build` folder       |
| `yarn compile`   | Compile all contracts to `build` folder  |
| `yarn coverage`  | Report test coverage                     |
| `yarn test`      | Run all tests in `test` folder           |
| `yarn test:unit` | Run unit tests in `test` folder          |
| `yarn deploy`    | Deploy on a network using --network flag |
| `yarn verify`    | Verify on a network using --network flag |

## Running Tests

:bulb: Prior to testing locally, run `yarn compile` in the `airswap-protocols` project root to build required artifacts.
