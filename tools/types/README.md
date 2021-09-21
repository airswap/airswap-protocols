# Types

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens. This repository contains a library of Swap Protocol types.

[![Discord](https://img.shields.io/discord/590643190281928738.svg)](https://discord.gg/ecQbV7H)
[![License](https://img.shields.io/badge/License-MIT-blue)](https://opensource.org/licenses/MIT)
![Twitter Follow](https://img.shields.io/twitter/follow/airswap?style=social)

## Resources

- About → https://about.airswap.io/
- Website → https://www.airswap.io/
- Twitter → https://twitter.com/airswap
- Chat → https://chat.airswap.io/

## Commands

| Command         | Description                                   |
| :-------------- | :-------------------------------------------- |
| `yarn`          | Install dependencies                          |
| `yarn clean`    | Delete the contract `build` folder            |
| `yarn compile`  | Compile all contracts to `build` folder       |
| `yarn coverage` | Run solidity-coverage to report test coverage |
| `yarn hint`     | Run a syntax linter for all Solidity code     |
| `yarn lint`     | Run a syntax linter for all JavaScript code   |
| `yarn test`     | Run all contract tests in `test` folder       |

## Running Tests

:bulb: Prior to testing locally, run `yarn compile` in the `airswap-protocols` project root to build required artifacts.
