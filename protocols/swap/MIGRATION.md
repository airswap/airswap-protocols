# Swap V1 to V2 Migration

This document is intended for those migrating from Swap V1 to V2 and does not include all of the features of Swap V2. [Read more about Swap V2](README.md).

:bulb: **Note**: A key feature of V2 is that every order must have a `nonce` value that is unique to its makerWallet.

## Signing an Order

Both V1 and V2 signatures can use the `eth_sign` function. [Read more about Signatures](README.md#signatures).

**V1** hashes arguments in the following order.

```
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

**V2** hashes arguments in the following order with the addition of `0x0` and the address of the `swapContract` to be used.

```
const ethUtil = require('ethereumjs-util')
const msg = web3.utils.soliditySha3(
  { type: 'bytes1', value: '0x0' },
  { type: 'address', value: swapContract },
  { type: 'uint256', value: nonce },
  { type: 'uint256', value: expiry },
  { type: 'address', value: makerWallet },
  { type: 'uint256', value: makerParam },
  { type: 'address', value: makerToken },
  { type: 'address', value: takerWallet },
  { type: 'uint256', value: takerParam },
  { type: 'address', value: takerToken }
)
const sig = await web3.eth.sign(ethUtil.bufferToHex(msg), signer)
return ethUtil.fromRpcSig(sig)
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

**V2** has a `swapSimple` function.

```
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
) external
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

:bulb: **Note**: The V2 swap functions are not `payable` and cannot accept ether for trades.

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
