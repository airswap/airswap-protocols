# Swap

[AirSwap](https://www.airswap.io/) is a peer-to-peer trading network for Ethereum tokens. This package contains source code and tests for the atomic `Swap` used to perform trustless token transfers between parties.

[![Discord](https://img.shields.io/discord/590643190281928738.svg)](https://discord.gg/ecQbV7H)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Features

### Atomic Swap

Transact directly peer-to-peer on Ethereum.

### Fungible and Non-Fungible

Swap between any two ERC-20 or ERC-721 assets.

### Typed Data Signatures

Sign informative messages for improved transparency.

### Delegate Authorization

Authorize peers to act on behalf of others.

### Affiliate Fees

Compensate those who facilitate trades.

### Trade with Anyone or Someone

Let anyone take an order or set a specific taker.

### Batch Cancels

Cancel multiple orders in a single transaction.

### Minimum Nonce

Invalidate all order nonces below a value.

## Definitions

| Term      | Definition                                                                        |
| :-------- | :-------------------------------------------------------------------------------- |
| Swap      | A transaction of multiple Token transfers that succeeds for all parties or fails. |
| Token     | A fungible (ERC-20) or non-fungible (ERC-721) Ethereum asset to be transferred.   |
| Maker     | A party that sets and signs the parameters and price of an Order.                 |
| Taker     | A party that accepts the parameters of an Order and settles it on Ethereum.       |
| Affiliate | An _optional_ party compensated by the Maker for facilitating a Swap.             |
| Delegate  | An _optional_ party authorized to make or take Orders on behalf of another party. |
| Order     | A specification of the tokens, amounts, and parties to a Swap.                    |
| Signature | An asymmetric cryptographic signature of an Order.                                |
| Nonce     | A numeric parameter of every Order that is unique to its Maker.                   |

## Swap

Swap between tokens (ERC-20 or ERC-721) or ETH with all features using typed data signatures.

```Solidity
function swap(
  Types.Order calldata _order,
  Types.Signature calldata _signature
) external payable
```

### Params

| Name        | Type        | Description                          |
| :---------- | :---------- | :----------------------------------- |
| `order`     | `Order`     | Order struct as specified below.     |
| `signature` | `Signature` | Signature struct as specified below. |

```Solidity
struct Order {
  uint256 nonce;   // A single use identifier for the Order
  uint256 expiry;  // The expiry in seconds since unix epoch
  Party maker;     // The Maker of the Order who sets price
  Party taker;     // The Taker of the Order who accepts price
  Party affiliate; // Optional affiliate to be paid by the Maker
}
```

```Solidity
struct Party {
  address wallet;  // The Ethereum account of the party
  address token;   // The address of the token the party sends or receives
  uint256 param;   // The amount of ERC-20 or the identifier of an ERC-721
}
```

```Solidity
struct Signature {
  address signer;  // The address of the signer Ethereum account
  bytes32 r;       // The `r` value of an ECDSA signature
  bytes32 s;       // The `s` value of an ECDSA signature
  uint8 v;         // The `v` value of an ECDSA signature
  bytes1 version;  // Indicates the signing method used
}
```

### Reverts

| Reason                         | Scenario                                                                     |
| :----------------------------- | :--------------------------------------------------------------------------- |
| `SIGNER_UNAUTHORIZED`          | Order has been signed by an account that has not been authorized to sign it. |
| `SIGNATURE_INVALID`            | Signature provided does not match the Order provided.                        |
| `ORDER_ALREADY_TAKEN`          | Order has already been taken by its `nonce` value.                           |
| `ORDER_ALREADY_CANCELED`       | Order has already been canceled by its `nonce` value.                        |
| `ORDER_EXPIRED`                | Order has an `expiry` lower than the current block time.                     |
| `NONCE_TOO_LOW`                | Nonce provided is below the minimum value set.                               |
| `SENDER_UNAUTHORIZED`          | Order has been sent by an account that has not been authorized to send it.   |
| `VALUE_MUST_BE_SENT`           | Order indicates an ether Swap but insufficient ether was sent.               |
| `VALUE_MUST_BE_ZERO`           | Order indicates a token Swap but ether was sent.                             |
| `MAKER_INSUFFICIENT_ALLOWANCE` | Maker has not approved the Swap contract to transfer the balance.            |
| `MAKER_INSUFFICIENT_BALANCE`   | Maker has an insufficient balance.                                           |
| `TAKER_INSUFFICIENT_ALLOWANCE` | Taker has not approved the Swap contract to transfer the balance.            |
| `TAKER_INSUFFICIENT_BALANCE`   | Taker has an insufficient balance.                                           |
| `INVALID_AUTH_DELEGATE`        | Delegate address is the same as the sender address.                          |
| `INVALID_AUTH_EXPIRY`          | Authorization expiry time is in the past.                                    |

## Swap (Simple)

Lightweight swap between tokens (ERC-20 or ERC-721) using simple signatures.

```Solidity
function swapSimple(
  uint256 _nonce,
  uint256 _expiry,
  address _makerWallet,
  uint256 _makerParam,
  address _makerToken,
  address _takerWallet,
  uint256 _takerParam,
  address _takerToken,
  uint8 _v,
  bytes32 _r,
  bytes32 _s
) external payable
```

### Params

| Name           | Type      | Description                                            |
| :------------- | :-------- | :----------------------------------------------------- |
| `_nonce`       | `uint256` | A single use identifier for the Order.                 |
| `_expiry`      | `uint256` | The expiry in seconds since unix epoch.                |
| `_makerWallet` | `address` | The Maker of the Order who sets price.                 |
| `_makerParam`  | `uint256` | The amount or identifier of the token the Maker sends. |
| `_makerToken`  | `address` | The address of the token the Maker sends.              |
| `_takerWallet` | `address` | The Taker of the Order who takes price.                |
| `_takerParam`  | `uint256` | The amount or identifier of the token the Taker sends. |
| `_takerToken`  | `address` | The address of the token the Taker sends.              |
| `_v`           | `uint8`   | The `v` value of an ECDSA signature.                   |
| `_r`           | `bytes32` | The `r` value of an ECDSA signature.                   |
| `_s`           | `bytes32` | The `s` value of an ECDSA signature.                   |

### Reverts

| Reason              | Scenario                                                 |
| :------------------ | :------------------------------------------------------- |
| `ORDER_EXPIRED`     | Order has an `expiry` lower than the current block time. |
| `ORDER_UNAVAILABLE` | Order has already been taken or canceled.                |
| `NONCE_TOO_LOW`     | Nonce provided is below the minimum value set.           |
| `SIGNATURE_INVALID` | Signature provided does not match the Order provided.    |

## Cancel

Provide an array of `nonces`, unique by Maker address, to mark one or more Orders as canceled.

```Solidity
function cancel(uint256[] memory nonces) external
```

## Set a Minimum Nonce

Provide a minimum value to invalidate all nonces below the value.

```Solidity
invalidate(uint256 minimumNonce) external
```

## Authorizations

Peers may authorize other peers to make (sign) or take (send) Orders on their behalf. This is useful for delegating authorization to a trusted third party, whether a user account or smart contract. An authorization works for both sides of a Swap, regardless of whether the delegate signing or sending on ones behalf.

### Authorize

Authorize a delegate account or contract to make (sign) or take (send) Orders on the sender's behalf. `swapSimple` only supports sender authorization, for example delegation to another smart contract to take orders.

```Solidity
function authorize(address delegate, uint256 expiry) external returns (bool)
```

### Revoke

Revoke the authorization of a delegate account or contract.

```Solidity
function revoke(address delegate) external returns (bool)
```

## Events

Ethereum transactions often emit events to indicate state changes or other provide useful information. The `indexed` keyword indicates that a filter may be set on the property. Learn more about events and filters in the [official documentation](https://solidity.readthedocs.io/en/v0.5.8/contracts.html#events).

### Swap

Emitted with a successful Swap.

```Solidity
event Swap(
  uint256 indexed nonce,
  uint256 timestamp,
  address indexed makerWallet,
  uint256 makerParam,
  address makerToken,
  address indexed takerWallet,
  uint256 takerParam,
  address takerToken,
  address affiliateWallet,
  uint256 affiliateParam,
  address affiliateToken
);
```

### Cancel

Emitted with a successful Cancel.

```Solidity
event Cancel(
  uint256 indexed nonce,
  address indexed makerAddress
);
```

### Invalidate

Emitted with a successful Invalidate.

```Solidity
event Invalidate(
  uint256 indexed nonce,
  address indexed makerAddress
);
```

## Signatures

When producing [ECDSA](https://hackernoon.com/a-closer-look-at-ethereum-signatures-5784c14abecc) signatures, Ethereum wallets prefix signed data with byte `\x19` to stay out of range of valid RLP so that a signature cannot be executed as a transaction. [EIP-191](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-191.md) standardizes this prefixing to include existing `personal_sign` behavior and [EIP-712](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md) implements it for structured data, which makes the data more transparent for the signer. Signatures are comprised of parameters `v`, `r`, and `s`. Read more about [Ethereum Signatures]().

### Typed Data

For use in the `swap` function. The `Signature` struct is passed to the function including a byte `version` to indicate `personal_sign` (`0x45`) or `signTypedData` (`0x01`) so that hashes can be recreated correctly in contract code.

#### Personal Sign

You can use `personal_sign` with `swap` by using an EIP-712 hashing function.

```JavaScript
const ethUtil = require('ethereumjs-util')
const { hashes } = require('@airswap/order-utils')
const orderHashHex = hashes.getOrderHash(order); // See: @airswap/order-utils/src/hashes.js:60
const sig = await web3.eth.sign(orderHashHex, signer);
const { r, s, v } = ethUtil.fromRpcSig(sig);
return {
  version: '0x45', // Version 0x45: personal_sign
  r, s, v
}
```

#### Sign Typed Data

You can use `signTypedData` with `swap` by calling it directly. Read more about [EIP-712](https://medium.com/metamask/eip712-is-coming-what-to-expect-and-how-to-use-it-bb92fd1a7a26).

```JavaScript
const ethUtil = require('ethereumjs-util')
const sigUtil = require('eth-sig-util')
const DOMAIN_NAME = 'SWAP'
const DOMAIN_VERSION = '2'
const verifyingContract = '0x0...' // Address of the Swap Contract
const sig = sigUtil.signTypedData(privateKey, {
  data: {
    types, // See: @airswap/order-utils/src/constants.js:4
    domain: {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      verifyingContract,
    },
    primaryType: 'Order',
    message: order, // See: @airswap/order-utils/src/orders.js:28
  },
});
const { r, s, v } = ethUtil.fromRpcSig(sig)
return {
  version: '0x01', // Version 0x01: signTypedData
  r, s, v
}
```

### Simple

For use in the `swapSimple` function. Signature parameters are passed in directly.

```JavaScript
const ethUtil = require('ethereumjs-util')
const msg = web3.utils.soliditySha3(
  // Version 0x00: Data with intended validator (verifyingContract)
  { type: 'bytes1', value: '0x0' },
  { type: 'address', value: verifyingContract },
  { type: 'uint256', value: nonce },
  { type: 'uint256', value: expiry },
  { type: 'address', value: makerWallet },
  { type: 'uint256', value: makerParam },
  { type: 'address', value: makerToken },
  { type: 'address', value: takerWallet },
  { type: 'uint256', value: takerParam },
  { type: 'address', value: takerToken },
);
const orderHashHex = ethUtil.bufferToHex(msg);
const sig = await web3.eth.sign(orderHashHex, signer);
const { r, s, v } = ethUtil.fromRpcSig(sig);
```
