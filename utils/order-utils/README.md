# Order Utils

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens. This package contains four helper libraries to help with interacting with the Airswap Protocol:

- [constants.js](./src/constants.js)
- [hashes.js](./src/hashes.js)
- [orders.js](./src/orders.js)
- [signatures.js](./src/signatures.js)

View the [helper library section of our docs]() for a detailed explanation of each of the functions in the libraries.

## Commands

| Command         | Description                                   |
| :-------------- | :-------------------------------------------- |
| `yarn`          | Install dependencies                          |
| `yarn test`     | Run all tests in `./test` using mocha         |
| `yarn ganache`  | Run an instance of `ganache-cli` for tests    |

## Running Tests

:bulb: Prior to testing locally, run `yarn ganache` in another terminal window. The tests require ganache to be running to test some of the signature helper functions.

## Resources

- Docs → https://docs.airswap.io/
- Website → https://www.airswap.io/
- Blog → https://blog.airswap.io/
- Support → https://support.airswap.io/

[![Discord](https://img.shields.io/discord/590643190281928738.svg)](https://discord.gg/ecQbV7H)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![CircleCI](https://circleci.com/gh/airswap/airswap-protocols.svg?style=svg&circle-token=73bd6668f836ce4306dbf6ca32109ddbb5b7e1fe)](https://circleci.com/gh/airswap/airswap-protocols)
![Twitter Follow](https://img.shields.io/twitter/follow/airswap?style=social)