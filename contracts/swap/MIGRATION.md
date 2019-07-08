# Swap V1 to V2 Migration

This document is intended for those migrating from Swap V1 to V2 and does not include all of the features of Swap V2. [Read more about Swap V2](README.md).

## Signing an Order

Using `eth_signTypedData` not available for `swapSimple`. [Read more about Signatures](README.md#signatures).

**V1** hashes arguments in the following order.

```
const hashedOrder = utils.solidityKeccak256([
  'address',
  'uint256',
  'address',
  'address',
  'uint256',
  'address',
  'uint256',
  'uint256',
], [
  makerAddress,
  makerAmount,
  makerToken,
  takerAddress,
  takerAmount,
  takerToken,
  expiration,
  nonce,
])
```

**V2** hashes arguments in the following order.

```
const hashedOrder = utils.solidityKeccak256([
  'bytes1',
  'address',
  'uint256',
  'uint256',
  'address',
  'uint256',
  'address',
  'address',
  'uint256',
  'address',
  'uint256',
], [
  '0x0',
  verifyingContract,
  nonce,
  expiry,
  makerAddress,
  makerAmount,
  makerToken,
  takerAddress,
  takerAmount,
  takerToken,
)
```

## Performing a Swap

**V1** has `fill` function.

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

A successful `fill` transaction will emit a `Filled` event.

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

**V2** has a `swapSimple` function. A key change is that every order is expected to have a `nonce` that is **unique to its makerWallet**.

```
function swapSimple(
  uint256 nonce,
  uint256 expiry,
  address makerWallet,
  uint256 makerParam,
  address makerToken,
  address takerWallet,
  uint256 takerParam,
  address takerToken,
  uint8 v,
  bytes32 r,
  bytes32 s
)
external payable
```

A successful `swapSimple` transaction will emit a `Swap` event.

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
