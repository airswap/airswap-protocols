# Wrapper: Security Report

Security report by Team Fluidity (team[at]fluidity[dot]io). Smart contracts are a nascent space, and no security audit procedure has been perfected. We welcome any suggestions and comments on this report, its contents, our methodology, or potential gaps in coverage.

Wrapper [Source Code](https://github.com/airswap/airswap-protocols/tree/master/source/wrapper) and [README](../README.md) are available in this repository. Commit used for report: [2a83c1ff2e46e6befa45889aa556fdd31e5c71fb](https://github.com/airswap/airswap-protocols/commit/2a83c1ff2e46e6befa45889aa556fdd31e5c71fb)

## Introduction

Wrapper is a shim over the Swap contract. The Swap contract only supports tokens (smart contracts), so for ether (ETH) to be used it must be wrapped (WETH). Wrapper determines whether to wrap and unwrap based on whether WETH is specified as the signerToken or senderToken on an order. If an order does not specify WETH for either party, execution is passed directly through to the Swap contract. Wrapper is written and primarily intended for the AirSwap Instant system. The following contracts are compiled with solidity 0.5.16.

## Structure

Wrapper is comprised of one contract and its dependencies.

[@airswap/wrapper/contracts/Wrapper.sol](../contracts/Wrapper.sol) @ [2a83c1ff2e46e6befa45889aa556fdd31e5c71fb](https://github.com/airswap/airswap-protocols/commit/2a83c1ff2e46e6befa45889aa556fdd31e5c71fb)

## Contracts

```
contracts/Wrapper.sol
* @airswap/swap/contracts/interfaces/ISwap.sol
† @airswap/tokens/contracts/interfaces/IWETH.sol
‡ openzeppelin-solidity/contracts/token/ERC20/IERC20.sol
```

`*` [@airswap/swap](https://github.com/airswap/airswap-protocols/tree/master/source/swap)
`†` [@airswap/tokens](https://github.com/airswap/airswap-protocols/tree/master/source/tokens)
`‡` [Open Zeppelin v2.0 Security Audit](https://drive.google.com/file/d/1gWUV0qz3n52VEUwoT-VlYmscPxxo9xhc/view)

## Constructor Params

```
`*` [@airswap/swap](https://github.com/airswap/airswap-protocols/tree/master/source/swap)
`‡` [WETH9](https://etherscan.io/token/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2)
```

`‡` [WETH9 Security Audit](https://github.com/bokkypoobah/MakerDAOSaiContractAudit/blob/master/audit/code-review/makerdao/weth9-b353893.md)

#### Public and external functions

| Function   | Source      | Visibility | Params                        | Payable |
| :--------- | :---------- | :--------- | :---------------------------- | :------ |
| swap       | Wrapper.sol | external   | `Types.Order calldata order` | yes     |
| [Fallback] | Wrapper.sol | external   | [None]                        | yes     |

## Invariants

### Ether (ETH) and token balances of the Wrapper are not altered by execution of the `swap` function.

- By inspection, all branches of the function `swap` either succeed or throw. At no point can these functions return false or fail silently without throwing.
- When sender token is WETH, all ether sent to the function is deposited to the WETH contract, and all the deposited WETH is transferred to the order sender wallet. This essentially deposits WETH for the sender prior to the underlying `swap` call. None is held by the Wrapper contract.
- When signer token is WETH, all WETH received by the sender after the underlying `swap` is withdrawn to the Wrapper contract instance. The ether (ETH) held by Wrapper is then sent to the wallet originating the transaction. None is held by the Wrapper contract.

* **This invariant holds as-is.**

### Every order to be settled through the Wrapper has a valid signature.

- By inspection and testing, line 75 requires that the order signature `v` value is not zero, which is also the value checked by the Swap contract to determine whether to check the signature.
- **This invariant holds as-is.**

### Every `swap` through a Wrapper must be transacted by the sender specified on the order.

- By inspection and testing, line 70 requires that the message sender is the same as the order sender wallet.
- **This invariant holds as-is.**

### Swap and WETH contracts used by a Wrapper are immutable and cannot be changed.

- By inspection, public `swapContract` and `wethContract` variables are only set in the contract constructor and not modified anywhere else in code.
- **This invariant holds as-is.**

### All expected behavior of the Swap contract holds entirely.

- By testing, the underlying `swap` function is executed and its invariants hold as expected.
- **This invariant holds as-is.**

## Testing

#### Unit and Integration Tests

See the [Unit](test/Wrapper-unit.js) and [Integration](test/Wrapper.js) tests.

```
yarn coverage
```

```
--------------|----------|----------|----------|----------|----------------|
File          |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
--------------|----------|----------|----------|----------|----------------|
 contracts/   |      100 |      100 |      100 |      100 |                |
  Imports.sol |      100 |      100 |      100 |      100 |                |
  Wrapper.sol |      100 |      100 |      100 |      100 |                |
--------------|----------|----------|----------|----------|----------------|
All files     |      100 |      100 |      100 |      100 |                |
--------------|----------|----------|----------|----------|----------------|
```

## Analysis

### Slither (static analyzer)

Slither warns to check return values of low level calls. If possible, the team should consider ensuring expected behavior with `require` statements.

```
Wrapper.swap(Types.Order) (Full.sol#456-506) ignores return value by low-level calls "msg.sender.call.value(_order.signer.param)()" (Full.sol#504)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#unchecked-low-level-calls
```

Slither warns to check return values of external calls. If possible, the team should consider ensuring expected behavior with `require` statements.

```
Wrapper.swap(Types.Order) (Full.sol#456-506) ignores return value by external calls "wethContract.transfer(_order.sender.wallet,_order.sender.param)" (Full.sol#480)
Wrapper.swap(Types.Order) (Full.sol#456-506) ignores return value by external calls "wethContract.transferFrom(_order.sender.wallet,address(this),_order.signer.param)" (Full.sol#497)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#unused-return
```

## Notes

- When deploying a Wrapper contract, we recommend using the [canonical WETH contracts](https://blog.0xproject.com/canonical-weth-migration-8a7ab6caca71).
- Trading ETH for WETH is neither an expected nor common use case for Swap, and is not supported by Wrapper. To convert between ETH and WETH, use the deposit and withdraw functions on the WETH contract.
