# Swap V1 to V2 Migration

This document is intended for those migrating from Swap V1 to V2 and does not include all of the features of Swap V2. [Read more about Swap V2](README.md).

:bulb: **Note**: A key feature of V2 is that every order must have a `nonce` value that is unique to its makerWallet.

## Signing an Order

Both V1 and V2 signatures can use the `eth_sign` function. [Read more about Signatures](README.md#signatures).

**V1** hashes arguments in the following order.

```JavaScript
const ethUtil = require('ethereumjs-util')
const msg = web3.utils.soliditySha3(
  { type: 'address', value: makerAddress },
  { type: 'uint256', value: makerAmount },
  { type: 'address', value: makerToken },
  { type: 'address', value: takerAddress },
  { type: 'uint256', value: takerAmount },
  { type: 'address', value: takerToken },
  { type: 'uint256', value: expiration },
  { type: 'uint256', value: nonce }
)
const sig = await web3.eth.sign(ethUtil.bufferToHex(msg), signer)
return ethUtil.fromRpcSig(sig)
```

**V2** hashes arguments according to an [EIP712](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md) structure. See [`@airswap/order-utils`](../../packages/order-utils) for the JavaScript source and [`@airswap/types`](../types) for the Solidity source.

```JavaScript
const { hashes } = require('@airswap/order-utils')
const orderHash = hashes.getOrderHash(order, swapContractAddress)
const orderHashHex = ethUtil.bufferToHex(orderHash)
const sig = await web3.eth.sign(orderHashHex, signer)
const { r, s, v } = ethUtil.fromRpcSig(sig)
return {
  version: '0x45', // EIP-191: Version 0x45 (personal_sign)
  signer,
  r,
  s,
  v,
}
```

Alternatively you can use `signatures` from the `order-utils` package.

```JavaScript
const { signatures } = require('@airswap/order-utils')
return await signatures.getWeb3Signature(order, signer, swapContractAddress)
```

Where `order` is specified by example below.

## Performing a Swap

The **V1** contract has `fill` function.

```
function fill(
  address makerAddress,
  uint makerAmount,
  address makerToken,
  address takerAddress,
  uint takerAmount,
  address takerToken,
  uint256 expiration,
  uint256 nonce,
  uint8 v,
  bytes32 r,
  bytes32 s
)
payable
```

A successful `fill` transaction emits a `Filled` event.

```
event Filled(
  address indexed makerAddress,
  uint makerAmount,
  address indexed makerToken,
  address takerAddress,
  uint takerAmount,
  address indexed takerToken,
  uint256 expiration,
  uint256 nonce
);
```

The **V2** contract has a `swap` function.

```
function swap(
  Types.Order calldata _order,
  Types.Signature calldata _signature
) external
```

Where the `_order` argument is an `Order` struct.

```
struct Order {
  uint256 nonce;    // Unique per order and should be sequential
  uint256 expiry;   // Expiry in seconds since 1 January 1970
  Party maker;      // Party to the trade that sets terms
  Party taker;      // Party to the trade that accepts terms
  Party affiliate;  // Party compensated for facilitating (optional)
}
```

The `_order` argument has multiple `Party` structs.

```
struct Party {
  address wallet;   // Wallet address of the party
  address token;    // Contract address of the token
  uint256 param;    // Value (ERC-20) or ID (ERC-721)
  bytes4 kind;      // Interface ID of the token
}
```

And the `_signature` argument is a `Signature` struct.

```
struct Signature {
  address signer;   // Address of the wallet used to sign
  uint8 v;          // `v` value of an ECDSA signature
  bytes32 r;        // `r` value of an ECDSA signature
  bytes32 s;        // `s` value of an ECDSA signature
  bytes1 version;   // EIP-191 signature version
}
```

The above are defined in the [`@airswap/types`](../types) library.

A successful `swap` transaction emits a `Swap` event.

```
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

:bulb: **Note**: The V2 swap function is not `payable` and cannot accept ether for trades.

## Canceling an Order

**V1** has `cancel` function that takes all the parameters of an order to cancel.

```
function cancel(
  address makerAddress,
  uint makerAmount,
  address makerToken,
  address takerAddress,
  uint takerAmount,
  address takerToken,
  uint256 expiration,
  uint256 nonce,
  uint8 v,
  bytes32 r,
  bytes32 s
)
```

A successful `cancel` transaction will emit a `Canceled` event.

```
event Canceled(
  address indexed makerAddress,
  uint makerAmount,
  address indexed makerToken,
  address takerAddress,
  uint takerAmount,
  address indexed takerToken,
  uint256 expiration,
  uint256 nonce
);
```

**V2** has a `cancel` function that takes an array of order nonces to cancel.

```
function cancel(
  uint256[] calldata nonces
) external
```

A successful `cancel` transaction will emit one or more `Cancel` events.

```
event Cancel(
  uint256 indexed nonce,
  address indexed makerWallet
);
```

## Failures

**Swap V1** will _succeed_ while emitting a `Failure` event. This presents challenges for debugging, customer support, and all kinds of integrations.

**Swap V2** will revert with a _reason._ [Read more about Failure Messages](README.md#failure-messages).
