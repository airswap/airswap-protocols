# Swap: Security Report

Security report by Team Fluidity (team[at]fluidity[dot]io). Smart contracts are a nascent space, and no security audit procedure has been perfected. We welcome any suggestions and comments on this report, its contents, our methodology, or potential gaps in coverage.

Swap [Source Code](https://github.com/airswap/airswap-protocols/tree/master/source/swap) and [README](../README.md) are available in this repository. Commit used for report: [2a83c1ff2e46e6befa45889aa556fdd31e5c71fb](https://github.com/airswap/airswap-protocols/commit/2a83c1ff2e46e6befa45889aa556fdd31e5c71fb)

## Introduction

Swap is a non-custodial exchange settlement contract. It is used in the Swap Protocol, a peer-to-peer trading protocol for Ethereum tokens. The implementation supports trading ERC-20 and ERC-721 tokens. Additional features include the ability to authorize another party to sign or send orders on one's behalf, and the ability to optionally set an affiliate that is compensated for bringing together trading parties. This contract only transfers tokens, no raw ether (ETH). The following contracts are compiled with solidity 0.5.16.

## Structure

Swap is comprised of one contract, its interface, and their dependencies.

[@airswap/swap/contracts/Swap.sol](../contracts/Swap.sol) @ [2a83c1ff2e46e6befa45889aa556fdd31e5c71fb](https://github.com/airswap/airswap-protocols/commit/2a83c1ff2e46e6befa45889aa556fdd31e5c71fb)

[@airswap/swap/interfaces/ISwap.sol](../interfaces/ISwap.sol) @ [2a83c1ff2e46e6befa45889aa556fdd31e5c71fb](https://github.com/airswap/airswap-protocols/commit/2a83c1ff2e46e6befa45889aa556fdd31e5c71fb)

## Contracts

```
contracts/Swap.sol
contracts/interfaces/ISwap.sol
* @airswap/types/contracts/Types.sol
* @airswap/tokens/contracts/interfaces/INRERC20.sol
† openzeppelin-solidity/contracts/token/ERC721/IERC721.sol
```

`*` [@airswap/types](https://github.com/airswap/airswap-protocols/tree/master/source/types)
`†` [Open Zeppelin v2.0 Security Audit](https://drive.google.com/file/d/1gWUV0qz3n52VEUwoT-VlYmscPxxo9xhc/view)

#### Public and external functions (non-getter functions)

| Function        | Source   | Visibility | Params                                         | Payable |
| :-------------- | :------- | :--------- | :--------------------------------------------- | :------ |
| swap            | Swap.sol | external   | `Types.Order order`                            | no      |
| cancel          | Swap.sol | external   | `uint256[] calldata nonces`                    | no      |
| invalidate      | Swap.sol | external   | `uint256 minimumNonce`                         | no      |
| authorizeSender | Swap.sol | external   | `address authorizedSender`, `uint256 expiry`   | no      |
| authorizeSigner | Swap.sol | external   | `address authorizedSigner`, `uint256 expiry`   | no      |
| revokeSender    | Swap.sol | external   | `address authorizedSender`                     | no      |
| revokeSigner    | Swap.sol | external   | `address authorizedSender`                     | no      |

## Invariants

### No ether (ETH) or tokens should be held by the contract address.

- No functions are payable and therefore ether (ETH) cannot be sent to the contract by calling any functions.
- By inspection, all branches of the function `swap` either succeed or throw. At no point can these functions return false or fail silently without throwing.
- All transfers in the execution function are between the signer and sender or a signer and affiliate; at no point is a token transfer performed to or from the Swap contract address.
- Tokens can however be sent to the contract by accident, and will remain as there is no withdrawal mechanism for any of the supported token standards. Looking at the Swap V1 contract ([0x8fd3121013a07c57f0d69646e86e7a4880b467b7](https://etherscan.io/address/0x8fd3121013a07c57f0d69646e86e7a4880b467b7)), there is 0 ether and < \$.10 stored, so we are comfortable without implementing a recovery backdoor.
- Although `selfdestruct` can forcefully send money to any non-payable contract; this is out of scope of review, and because this.balance is not used in the code, cannot lead to security issues.
- **This invariant holds as-is.**

### The `swap` function will only either successfully settle an order or revert.

- By manual inspection and testing, after checks for expiry (line 87), nonce validity (lines 91, 95), sender validity (lines 102:121), and signer and signature validity (lines 124:144), the swap completes, barring issues on the underlying token contracts. Each of these checks will revert with a reason in a failure case.
- A `require` is used in the ERC-20 case to handle tokens where a bad transfer may fail silently without reversions. This is the only external call other than safeTransferFrom, for the ERC-721 case, which has no return value and therefore cannot fail silently.
- **This invariant holds as-is.**

### An order cannot be settled at any time beyond the `expiry` specified on the order.

- The `expiry` of each order is checked in the first line of the `swap` function, comparing the `expiry` to `block.timestamp` and throwing if at or beyond it.
- **This invariant holds as-is.**

### Signatures cannot be forged or duplicated.

- Each order includes a unique `nonce` that ensures a unique signature for each order.
- The `isValid` function ensures that the provided signature is indeed a signature of the provided order.
- There are two signining methods supported by `isValid` both of which use `ecrecover` to recover the public address of the key that signed it. The only difference is that one method prefixes the hash with "\x19Ethereum Signed Message:\n32" for signatures generated by `personal_sign`.
- The output of a correct `ecrecover` cannot be forged without knowledge of the signing private key.
- All parameters that are hashed are fixed size and stored in memory, making it impossible to exploit padding or offset vulnerabilities.
- During hashing, a "verifying contract" is provided in accordance with [EIP-712](https://eips.ethereum.org/EIPS/eip-712) to ensure that a given order was intended to be settled by a given Swap contract instance.
- **This invariant holds as-is.**

### Parties authorized to **send** on behalf of others may not **sign** on their behalf.

- - By inspection and testing, in the **sender** checking logic, only `isSenderAuthorized` is called on line 116. This function checks the `senderAuthorizations` mapping which is only modified by `authorizeSender` and `revokeSender`.
- **This invariant holds as-is.**

### Parties authorized to **sign** on behalf of others may not **send** on their behalf.

- By inspection and testing, in the **signature** checking logic between lines 124 and 144, only `isSignerAuthorized` is called on lines 129 and 137. This function checks the `signerAuthorizations` mapping which is only modified by `authorizeSigner` and `revokeSigner`.
- **This invariant holds as-is.**

### An authorized party may not settle trades after the expiry specified in the authorization.

- By inspection and testing, `authorizeSender` on line 222 sets the new expiry and `isSenderAuthorized` on line 276 ensures that the authorization expiry is above the block timestamp. In `authorizeSigner` line 238 sets the expiry, and in `isSignerAuthorized` line 290 ensures that the authorization expiry is above the block timestamp.
- **This invariant holds as-is.**

### Affiliate trades supply correct fees from signer to sender.

- By inspection and testing, the transfer from signer to affiliate will complete, barring issues on the underlying token contract, on line 165. In the transferToken function, when calling safeTransferFrom, a `require` is not required for safeTransferFrom as the contract signature guarantees there is no return parameter.
- **This invariant holds as-is.**

### A nonce status can never change once set to UNAVAILABLE.

- The `signerNonceStatus` of a provided `nonce` is checked in the second line of the `swap` function, ensuring that it is `AVAILABLE` (`0x00`) or throwing othewise.
- By inspection, `signerNonceStatus` for the provided `nonce` is only set to UNAVAILABLE two lines later in the `swap` function and also within the loop inside of the `cancel` function. It is not set to any value other than `UNAVAILABLE` or set in any other cases.
- **This invariant holds as-is.**

### Setting a minimum nonce makes it impossible to settle an order with a lower nonce.

- By manual inspection and testing, the `invalidate` function takes a miniumum nonce, which is set for the transaction sender. In the `swap` function on line 95, the provided nonce must be **greater than or equal to** the minimum nonce for the order signer.
- **This invariant holds as-is.**

### Orders can only be successfully taken once.

- In a successful transaction, on line 99, the nonce status is set to UNAVAILABLE, which makes it impossible, given the require statement on line 91, to complete the same swap twice.
- Given the "verifying contract" provided for the hash in the signing process, and given the respective check on the Swap contract, a signature is invalid if not intended for the Swap contract instance doing the verification.
- **This invariant holds as-is.**

### No calls are made to the underlying token contracts until the internal transferToken call.

- Holds by inspection, as the only calls made to underlying token contracts are in the `transferToken` function. Applications using this contract may opt to do pre-swap checks to ensure a good user experience in the case that token balances are too low or have not yet been approved on the Swap contract.
- **This invariant holds as-is.**

## Testing

#### Unit and Integration Tests

See the [Unit](test/Swap-unit.js) and [Integration](test/Swap.js) tests.

```
yarn test
```

```
--------------|----------|----------|----------|----------|----------------|
File          |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
--------------|----------|----------|----------|----------|----------------|
 contracts/   |      100 |      100 |      100 |      100 |                |
  Imports.sol |      100 |      100 |      100 |      100 |                |
  Swap.sol    |      100 |      100 |      100 |      100 |                |
--------------|----------|----------|----------|----------|----------------|
All files     |      100 |      100 |      100 |      100 |                |
--------------|----------|----------|----------|----------|----------------|
```

## Analysis

### Slither (static analyzer)

Slither generates warnings against using `block.timestamp`, which is necessary in the current design for order and authorization expiry.

```
Swap.swap(Types.Order) (Swap.sol#77-174) uses timestamp for comparisons
	Dangerous comparisons:
	- require(bool,string)(order.expiry > block.timestamp,ORDER_EXPIRED) (Swap.sol#82-83)
Swap.authorizeSender(address,uint256) (Swap.sol#211-219) uses timestamp for comparisons
	Dangerous comparisons:
	- require(bool,string)(expiry > block.timestamp,INVALID_AUTH_EXPIRY) (Swap.sol#216)
Swap.authorizeSigner(address,uint256) (Swap.sol#227-235) uses timestamp for comparisons
	Dangerous comparisons:
	- require(bool,string)(expiry > block.timestamp,INVALID_AUTH_EXPIRY) (Swap.sol#232)
Swap.isSenderAuthorized(address,address) (Swap.sol#267-273) uses timestamp for comparisons
	Dangerous comparisons:
	- ((authorizer == delegate) || senderAuthorizations[authorizer][delegate] > block.timestamp) (Swap.sol#271-272)
Swap.isSignerAuthorized(address,address) (Swap.sol#281-287) uses timestamp for comparisons
	Dangerous comparisons:
	- ((authorizer == delegate) || (signerAuthorizations[authorizer][delegate] > block.timestamp)) (Swap.sol#285-286)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#block-timestamp
```

## Notes

- When using the `cancel` function, because there is no limit on the number of nonces that may be provided, an out of gas error may be thrown if the number is too high.
- An affiliate fee can be any token and any size, so both signers and senders must be vigilant when requesting and setting affiliate fees, so as to not be tricked into transferring unexpected amounts to an affiliate.
