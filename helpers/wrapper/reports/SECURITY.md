# Security Report: Wrapper

Smart Contract Security Report by Team Fluidity (team[at]fluidity[dot]io) and Phil Daian (feedback[at]stableset[dot]com)
Hash of master used for report: [ef5cff0613532d27ecedb332e222ae0a75079841](https://github.com/airswap/airswap-protocols/commit/ef5cff0613532d27ecedb332e222ae0a75079841)

Wrapper [Source Code](https://github.com/airswap/airswap-protocols/tree/master/helpers/wrapper) and [README](../README.md)

## Introduction

The Swap Protocol is a peer-to-peer protocol for trading Ethereum tokens that allows two parties to exchange tokens in an atomic transaction. It is a non-custodial exchange settlement contract. The "Wrapper" contract facilitates sending and receiving ether for WETH (wrapped ether) trades on the Swap contract. Contracts are compiled with v0.5.10.a6ea5b19 (0.5.10 stable release).

## Structure

Wrapper is comprised of a single contract.

[@airswap/wrapper/contracts/Wrapper.sol](../contracts/Wrapper.sol) @ [ef5cff0613532d27ecedb332e222ae0a75079841](https://github.com/airswap/airswap-protocols/commit/ef5cff0613532d27ecedb332e222ae0a75079841)

Deployment of Wrapper.sol was performed in the `@airswap/wrapper` package in the `airswap-protocols` monorepo.

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

| Function | Source      | Visibility | Params                        | Payable |
| :------- | :---------- | :--------- | :---------------------------- | :------ |
| swap     | Wrapper.sol | external   | `Types.Order calldata _order` | yes     |
| fallback | Wrapper.sol | external   | none                          | yes     |

## Invariants

#### 1. No ether or tokens should be held by the contract address due to a failure.

- WETH and Swap functions REVERT on failure cases within Wrapper. Similarly, Wrapper will REVERT in case any token or ether transfers fail within Wrapper.swap.
- **This invariant currently holds as-is.**

#### 2. Contract ether and token balances should remain unchanged after each swap.

- Wrapper does not perform any arithmetic computation, or call this.balance. It passes the full token or ether amounts received along or REVERTS the transaction.
- **This invariant currently holds as-is.**

#### 3. If ether is sent to Wrapper.swap, it should be deposited to WETH for the swap.

- When WETH is specified as the senderToken, the contract requires that the equivalent message value (ether) was sent with the transaction. The contract then deposits this value to WETH and transfers it to the message sender so that their side of the trade will succeed.
- **This invariant currently holds as-is.**

#### 4. If WETH is received after a swap, it should be withdrawn and sent to the sender.

- When WETH is specified as the signerToken, the contract transfers the WETH to itself on behalf of the order sender. The contract then withdraws the ether and transfers the amount to the message sender. Both the `transferFrom` and `withdraw` functions on the WETH contract will REVERT if they fail.
- **This invariant currently holds as-is.**

#### 5. ISwap and IWeth contract addresses are immutable, any updates will require new deploy of Wrapper.

- There are no methods within the Wrapper that allow the Swap contract or the WETH contract to be changed; the Swap and WETH contracts provided on deployment are permanent. There is no functionality whatsoever that allows changing the addresses.
- **This invariant currently holds as-is.**

#### 6. Only the sender specified on an order may execute Wrapper.swap.

- Because the sender has authorized the wrapper on the swap contract, the wrapper requires that the sender of the transaction be the same as the order sender.
- **This invariant holds as-is.**

#### 6. The contract is safeguarded against re-entrancy attacks that can make unauthorized or unexpected ether or token transfers.

- Confirmed through manual inspection walking through several attack scenarios. Prior to Swap.swap being called, the transfers use a well-known WETH contract that does not unexpectedly hold balances. It will always REVERT on failures (see WETH audit for notes). After the first conditional in Wrapper.swap, the Swap.swap re-entrancy guards prevent duplicate orders from being submitted and filled. In addition, the fallback function locks ether transfers to only the WETH smart contract.
- **This invariant currently holds as-is.**

#### 8. Sending the same parameters twice will have the same guarantees as the Swap contract.

- Calls to Wrapper.swap are idempotent. When called many times, the beginning and end state are the same due to having either swapped WETH or transferred ether out of the contract within each transaction.
- **This invariant currently holds as-is.**

#### 9. If WETH is not specified on either side of a trade the contract should effectively pass through to Swap.swap.

- In this scenario, none of the conditional statements for Wrapper.swap are hit and thus only swapContract.swap method is called.
- **This invariant currently holds as-is.**

#### 10. If ether is sent to the contract by anything other than the WETH contract it should REVERT.

- When the contract withdraws from WETH, the WETH contract sends it ether, which is then transferred to the message sender. Otherwise in the fallback function, any message sender other than the WETH address will REVERT.
- **This invariant currently holds as-is.**

#### 11. Wrapper should not have any impact on affiliates specified to receive WETH.

- In this scenario, an affiliate that is specified to receive WETH will receive WETH if Swap.swap succeeds. There is no wrapping or unwrapping for affiliate parties.
- **This invariant currently holds as-is.**

## Analysis

#### Slither (static analyzer)

Medium Severity Detected:
Wrapper.constructor (Wrapper.sol#42-51) ignores return value by external calls "wethContract.approve(\_swapContract,MAX_INT)" (Wrapper.sol#50)

Wrapper.swap (Wrapper.sol#72-141) ignores return value by external calls "wethContract.transferFrom(\_senderWallet,address(this),\_signerAmount)" (Wrapper.sol#122)
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

100% coverage between unit and integration tests running [solidity-coverage](https://github.com/sc-forks/solidity-coverage).

```
  29 passing (5s)

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

## Migrations

Hash of master used for deploy: [ef5cff0613532d27ecedb332e222ae0a75079841](https://github.com/airswap/airswap-protocols/commit/ef5cff0613532d27ecedb332e222ae0a75079841)

Rinkeby Etherscan (Wrapper): [0x15FC598E31B98D73a7d56e10f079b827cb97Af82](https://rinkeby.etherscan.io/address/0x15FC598E31B98D73a7d56e10f079b827cb97Af82)

- \_swapContract = [0x6f337bA064b0a92538a4AfdCF0e60F50eEAe0D5B](https://rinkeby.etherscan.io/address/0x6f337bA064b0a92538a4AfdCF0e60F50eEAe0D5B)
- \_wethContract = [0xc778417E063141139Fce010982780140Aa0cD5Ab](https://rinkeby.etherscan.io/address/0xc778417E063141139Fce010982780140Aa0cD5Ab)

Mainnet Etherscan (Wrapper): [0x5abcFbD462e175993C6C350023f8634D71DaA61D](https://etherscan.io/address/0x5abcFbD462e175993C6C350023f8634D71DaA61D)

- \_swapContract = [0x251F752B85a9F7e1B3C42D802715B5D7A8Da3165](https://etherscan.io/address/0x251F752B85a9F7e1B3C42D802715B5D7A8Da3165)
- \_wethContract = [0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2](https://etherscan.io/address/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2)

## Notes

- Because of two issues found with ABIEncoderV2, we ensured that the newest version of the Solidity compiler was used where those issues were resolved. More information can be found at the [Ethereum Foundation blog](https://blog.ethereum.org/2019/03/26/solidity-optimizer-and-abiencoderv2-bug/).
- Smart contracts are a nascent space, and no perfect security audit procedure has thus far been perfected for their deployment. We welcome any suggestions or comments on this report, its contents, our methodology, or potential gaps in coverage.
