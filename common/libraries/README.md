# Libraries

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens. This package contains libraries `Transfers` and `Types` used in the Swap Protocol.

[![Discord](https://img.shields.io/discord/590643190281928738.svg)](https://discord.gg/ecQbV7H)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Types

### Party Struct

| Param  | Type      | Description                    |
| :----- | :-------- | ------------------------------ |
| wallet | `address` | Wallet address of the party    |
| token  | `address` | Contract address of the token  |
| param  | `uint256` | Value (ERC-20) or ID (ERC-721) |

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
