# Security Report: Wrapper

Smart Contract Security Report by Team Fluidity (team[at]fluidity[dot]io) and Phil Daian (feedback[at]stableset[dot]com)
Hash of master used for report: [aec813337e7f2320162d9314932a553c0a52c9dc](https://github.com/airswap/airswap-protocols/commit/aec813337e7f2320162d9314932a553c0a52c9dc)

Wrapper [Source Code](https://github.com/airswap/airswap-protocols/tree/master/helpers/wrapper) and [README](../README.md)

## Introduction

The Wrapper contract facilitates using ether for wrapped ether (WETH) trades on the Swap contract. If a swap is performed through the Wrapper with a message value (ether) it will deposit the ether to WETH and then perform the swap. Additionally, if receiving WETH in the swap, it will withdraw the ether and transfer it to the message sender. The contracts are compiled with v0.5.10.a6ea5b19 (0.5.10 stable release).

## Structure

Wrapper is comprised of a single contract.

[@airswap/wrapper/contracts/Wrapper.sol](../contracts/Wrapper.sol) @ [aec813337e7f2320162d9314932a553c0a52c9dc](https://github.com/airswap/airswap-protocols/commit/aec813337e7f2320162d9314932a553c0a52c9dc)

## Dependencies

[Open Zeppelin v2.0 Security Audit](https://drive.google.com/file/d/1gWUV0qz3n52VEUwoT-VlYmscPxxo9xhc/view)

_Externally Audited Files from the OpenZeppelin library (v2.2)_

```
IERC20.sol
```

_Externally Audited files from OpenZeppelin library used solely for tests_

```
ERC20Mintable.sol
```

[WETH9 Audit](https://github.com/bokkypoobah/MakerDAOSaiContractAudit/blob/master/audit/code-review/makerdao/weth9-b353893.md)
\_Externally Audited files from WETH used solely for tests

```
WETH9.sol
```

## Contracts

```
Wrapper.sol
ISwap.sol
IWeth.sol
** IERC20.sol
```

_\*\* OpenZeppelin contract_

#### Public and external functions (non-getter functions)

| Function | Source      | Visibility | Params                                                             | Payable |
| :------- | :---------- | :--------- | :----------------------------------------------------------------- | :------ |
| swap     | Wrapper.sol | external   | `Types.Order calldata _order, Types.Signature calldata _signature` | yes     |
| fallback | Wrapper.sol | external   | none                                                               | yes     |

## Invariants

#### 1. No ether or tokens should be held by the contract address due to a failed swap.

- WETH and Swap functions REVERT on failure cases within Wrapper. Similarly, Wrapper will REVERT in case any movements of tokens or ether fails within Wrapper.swap.

#### 2. Contract Ether and Token balances should remain unchanged after each swap.

- Wrapper does not perform any arithmetic computation, or call this.balance. It passses the full token or ether amounts received along or REVERTS the transaction.
- **This invariant currently holds as-is.**

#### 3. If Ether is sent to Wrapper.swap, it should be deposited to WETH and then traded.

- When ETH is sent to the contract by the taker, the wrapper contract will deposit to the WETH contract and perform the swap. This prevents the contract from holding any Ether and subsequently any WETH.

- **This invariant currently holds as-is.**

#### 4. If WETH is received with a swap, it should be withdrawn and sent to the sender.

- When WETH is sent to the contract by the taker, the wrapper contract will perform the swap and obtain WETH, the WETH is then withdrawn and transferred to the maker. If there are any failed transactions, the overall transaction will REVERT.

- **This invariant currently holds as-is.**

#### 5. ISwap and IWeth contracts are immutable, any updates will require new deploy of Wrapper.

- There are no methods within the Wrapper that allow the Swap contract or the WETH contract to be set; the Swap and WETH contracts provided on deployment are permanent. There is no functionality whatsoever that allows changing the addresses.
- **This invariant currently holds as-is.**

#### 6. Protected from re-entrancy attacks such that multiple parties could use Wrapper and receive more balances.

#### 7. Sending the same parameters twice will have the same guarantees as the Swap contract.

- Calls to Wrapper.swap are idempotent. When called many times, the beginning and final state are the same due to having either swapped WETH or transferring ether out of the contract.
- **This invariant currently holds as-is.**

#### 8. Non-WETH ERC20 swaps with non-null taker address should occur similar to Swap.swap.

- In this scenario, none of the conditional statements for Wrapper.swap are hit and thus just swapContract.swap method was called.
- **This invariant currently holds as-is.**

## Analysis

#### Slither (static analyzer)

Medium Severity Detected:
Wrapper.constructor (Wrapper.sol#42-51) ignores return value by external calls "wethContract.approve(\_swapContract,MAX_INT)" (Wrapper.sol#50)

Wrapper.swapSimple (Wrapper.sol#72-141) ignores return value by external calls "wethContract.transferFrom(\_takerWallet,address(this),\_makerAmount)" (Wrapper.sol#122)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#unused-return

External call is being made to a known contract implementation of WETH9.sol. WETH9.sol either returns True of revert, there are no instances where it returns False during approve or transferFrom.

Full slither output located in [./analysis/slither.txt](./analysis/slither.txt)

## Testing

#### Unit and Integration Tests

```
helpers/wrapper/tests/Wrapper-unit.js
helpers/wrapper/test/Wrapper.js
```

#### Test Coverage

100% coverage between unit and integration tests.

| File        | % Stmts | % Branch | % Funcs | % Lines | Uncovered Lines |
| :---------- | :------ | :------- | :------ | :------ | :-------------- |
| contracts/  | 100     | 100      | 100     | 100     |                 |
| Wrapper.sol | 100     | 100      | 100     | 100     |                 |

## Migrations

Hash of master used for deploy: [aec813337e7f2320162d9314932a553c0a52c9dc](https://github.com/airswap/airswap-protocols/commit/aec813337e7f2320162d9314932a553c0a52c9dc)

Rinkeby Etherscan (Wrapper): [0xE6dbe98486B25f0D1bd247c2052dbb9E1F0Fe023](https://rinkeby.etherscan.io/address/0xE6dbe98486B25f0D1bd247c2052dbb9E1F0Fe023)

- \_swapContract = [0x78Db49D0459a67158BdCA6e161BE3D90342C7247](https://rinkeby.etherscan.io/address/0x78Db49D0459a67158BdCA6e161BE3D90342C7247)
- \_wethContract = [0xc778417E063141139Fce010982780140Aa0cD5Ab](https://rinkeby.etherscan.io/address/0xc778417E063141139Fce010982780140Aa0cD5Ab)

## Notes

- Because of two issues found with ABIEncoderV2, we ensured that the newest version of the Solidity compiler was used where those issues were resolved. More information can be found at the [Ethereum Foundation blog](https://blog.ethereum.org/2019/03/26/solidity-optimizer-and-abiencoderv2-bug/).
- Smart contracts are a nascent space, and no perfect security audit procedure has thus far been perfected for their deployment. We welcome any suggestions or comments on this report, its contents, our methodology, or potential gaps in coverage.
