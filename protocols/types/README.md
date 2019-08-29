# Types

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens. This repository contains a library of Swap Protocol types and hashes.

[![Discord](https://img.shields.io/discord/590643190281928738.svg)](https://discord.gg/ecQbV7H)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Deployments

| Contract | Version | Network | Address                                                                                                                         |
| :------- | :------ | :------ | :------------------------------------------------------------------------------------------------------------------------------ |
| Types    | `0.1.0` | Mainnet | [`0x2fA5d35f9c99E11a75F2D3cD9F6E6d904a1241C5`](https://etherscan.io/address/0x2fA5d35f9c99E11a75F2D3cD9F6E6d904a1241C5)         |
| Types    | `0.2.0` | Rinkeby | [`0x4A041FA0a727c828616C83C090585913221641ba`](https://rinkeby.etherscan.io/address/0x4A041FA0a727c828616C83C090585913221641ba) |

## Types

### Party Struct

| Param  | Type      | Description                    |
| :----- | :-------- | ------------------------------ |
| wallet | `address` | Wallet address of the party    |
| token  | `address` | Contract address of the token  |
| param  | `uint256` | Value (ERC-20) or ID (ERC-721) |
| kind   | `bytes4`  | Interface ID of the token      |

### Order Struct

| Param     | Type      | Description                                   |
| :-------- | :-------- | --------------------------------------------- |
| nonce     | `uint256` | Unique per order and should be sequential     |
| expiry    | `uint256` | Expiry in seconds since 1 January 1970        |
| maker     | `Party`   | Party to the trade that sets terms            |
| taker     | `Party`   | Party to the trade that accepts terms         |
| affiliate | `Party`   | Party compensated for facilitating (optional) |

### Signature Struct

| Param   | Type      | Description                                                                               |
| :------ | :-------- | ----------------------------------------------------------------------------------------- |
| signer  | `address` | Address of the wallet used to sign                                                        |
| v       | `uint8`   | `v` value of an ECDSA signature                                                           |
| r       | `bytes32` | `r` value of an ECDSA signature                                                           |
| s       | `bytes32` | `s` value of an ECDSA signature                                                           |
| version | `bytes1`  | [EIP-191](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-191.md) signature version |
