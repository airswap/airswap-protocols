# Solidity Style Guide for AirSwap

## Constants

We use UPPER_CASE constants with underscores between words.

## Variables

We use camelCase variable names with capitals between words.

### Private

Prefix with underscore. e.g.

```
    private address _tradeWallet
```

### Arguments

Function arguments are camelCase.

```
    function setRule(
      address senderToken,
      address signerToken,
      uint256 maxSenderAmount,
      uint256 priceCoef,
      uint256 priceExp
    ) external onlyAdmin
```

Function arguments should be separated by newlines.

```
    function setRule(address senderToken, address signerToken)
```

    ...becomes...

```
    function setRules(
        address senderToken,
        address signerToken
    )
```

## Functions

### Naming

Function names are in camelCase.

Internal and private functions are named with leading underscore.

### Ordering

Functions are ordered by their visibility however this is also affected by whether they are a `view`, `pure` or not.

- public
- external
- internal
- private

Run `yarn hint` and solhint will enforce the correct ordering.

## Constructors

### Arguments

Prefix all arguments with the name of the current contract.

```
    contract Delegate {
    ...
        constructor(
          ISwap delegateSwapContract,
          address delegateContractOwner,
          address delegateTradeWallet
        ) public
    ...
    }
```

## Events

- Use the same name as the function that emits them e.g.
  - e.g. function setIntent() —> emit SetIntent(...)
- If there's an interface, the event definitions go in the interface

## Comments

Function documentation should follow [NatSpec](https://solidity.readthedocs.io/en/v0.5.12/natspec-format.html). Periods not required on statements. Interfaces do not need to have Natspec on them if there is only a single implemented contract from them, example ISwap.sol.

```
    /**
      * @notice Unset a Trading Rule
      * @dev Only callable by the owner of the contract
      * @param senderToken address The token the delegate would send
      * @param signerToken address The token the consumer would send
      */
```

Comments in the body should use `//` and be full, punctuated sentences.

    // Transfer ownership to an address if specified.

## Tabs or Spaces

2 spaces (which can be implemented as a tab in your editor)

## Solhint

Run from the root directory of `airswap-protocols` using `yarn hint`

```
    {
      "extends": "solhint:default",
      "rules": {
            "func-param-name-mixedcase": "error",      // paramName
        "func-name-mixedcase": "error",            // functionName
        "event-name-camelcase": "error",           // EventName
        "var-name-mixedcase": "error",             // varName
        "modifier-name-mixedcase": "error",        // modifierName
        "contract-name-camelcase": "error",        // ContractName
        "const-name-snakecase": "error",           // CONSTANT_NAME
        "visibility-modifier-order": "error",
        "func-visibility": "error",
        "state-visibility": "error",
        "ordering": "error",
        "quotes": "error",
        "max-line-length": "error",
        "no-unused-vars": "error",
        "no-complex-fallback": "warn",
        "check-send-result": "warn",
        "reentrancy": "warn"
      }
    }
```
