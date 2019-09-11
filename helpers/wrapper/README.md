# Wrapper

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens. This package contains an example contract that wraps and unwraps ether for WETH trades in the Swap Protocol. The Wrapper contract is designed to work primarily with AirSwap Instant application [https://instant.airswap.io/tokens]. It allows consumers to send ether and receive ether while the Swap protocol handles ERC20 and ERC721 token transfers.

[![Discord](https://img.shields.io/discord/590643190281928738.svg)](https://discord.gg/ecQbV7H)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Deployments

| Contract | Version | Network | Address                                                                                                                         |
| :------- | :------ | :------ | :------------------------------------------------------------------------------------------------------------------------------ |
| Wrapper     | `0.2.0` | Mainnet | [`0x5abcFbD462e175993C6C350023f8634D71DaA61D`](https://etherscan.io/address/0x5abcFbD462e175993C6C350023f8634D71DaA61D)         |
 ↳ Swap       | `2.1.0` | Mainnet | [`0x251F752B85a9F7e1B3C42D802715B5D7A8Da3165`](https://etherscan.io/address/0x251F752B85a9F7e1B3C42D802715B5D7A8Da3165)
 ↳ WETH        |    ext | Mainnet | [`0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2`](https://etherscan.io/address/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2)
|             |         |         |
| Wrapper     | `0.2.0` | Rinkeby | [`0x15FC598E31B98D73a7d56e10f079b827cb97Af82`](https://rinkeby.etherscan.io/address/0x15FC598E31B98D73a7d56e10f079b827cb97Af82) |
↳ Swap        | `2.1.0` | Rinkeby | [`0x6f337bA064b0a92538a4AfdCF0e60F50eEAe0D5B`](https://etherscan.io/address/0x6f337bA064b0a92538a4AfdCF0e60F50eEAe0D5B)
↳ WETH        |    ext  | Rinkeby | [`0xc778417E063141139Fce010982780140Aa0cD5Ab`](https://etherscan.io/address/0xc778417E063141139Fce010982780140Aa0cD5Ab)

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