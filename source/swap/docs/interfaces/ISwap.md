## <span id="ISwap"></span> `ISwap`

``





### Features

**Authorizations** are for peers that trade on behalf of others. These peers are authorized by an individual to send or sign orders for them. Peers can be wallets (people or programs) or smart contracts.

**Affiliates** are third-parties compensated for their part in bringing together the two parties of a trade, and can be other traders or software applications that connect traders on the network.


### Functions

#### <span id="ISwap-swap-struct-Types-Order-"></span> `swap(struct Types.Order order)` (external)

Atomic Token Swap



| Param             | Description       |
| ----------------- | :------------    |
|`order`|Types.Order




#### <span id="ISwap-cancel-uint256---"></span> `cancel(uint256[] nonces)` (external)

Cancel one or more open orders by nonce



| Param             | Description       |
| ----------------- | :------------    |
|`nonces`|uint256[]




#### <span id="ISwap-cancelUpTo-uint256-"></span> `cancelUpTo(uint256 minimumNonce)` (external)

Cancels all orders below a nonce value


These orders can be made active by reducing the minimum nonce

| Param             | Description       |
| ----------------- | :------------    |
|`minimumNonce`|uint256




#### <span id="ISwap-authorizeSender-address-"></span> `authorizeSender(address authorizedSender)` (external)

Authorize a delegated sender



| Param             | Description       |
| ----------------- | :------------    |
|`authorizedSender`|address




#### <span id="ISwap-authorizeSigner-address-"></span> `authorizeSigner(address authorizedSigner)` (external)

Authorize a delegated signer



| Param             | Description       |
| ----------------- | :------------    |
|`authorizedSigner`|address




#### <span id="ISwap-revokeSender-address-"></span> `revokeSender(address authorizedSender)` (external)

Revoke an authorization



| Param             | Description       |
| ----------------- | :------------    |
|`authorizedSender`|address




#### <span id="ISwap-revokeSigner-address-"></span> `revokeSigner(address authorizedSigner)` (external)

Revoke an authorization



| Param             | Description       |
| ----------------- | :------------    |
|`authorizedSigner`|address




#### <span id="ISwap-senderAuthorizations-address-address-"></span> `senderAuthorizations(address, address) → bool` (external)









#### <span id="ISwap-signerAuthorizations-address-address-"></span> `signerAuthorizations(address, address) → bool` (external)









#### <span id="ISwap-signerNonceStatus-address-uint256-"></span> `signerNonceStatus(address, uint256) → bytes1` (external)









#### <span id="ISwap-signerMinimumNonce-address-"></span> `signerMinimumNonce(address) → uint256` (external)










### Events

- [`Swap(uint256 nonce, uint256 timestamp, address signerWallet, uint256 signerParam, address signerToken, address senderWallet, uint256 senderParam, address senderToken, address affiliateWallet, uint256 affiliateParam, address affiliateToken)`][ISwap-Swap-uint256-uint256-address-uint256-address-address-uint256-address-address-uint256-address-]
- [`Cancel(uint256 nonce, address signerWallet)`][ISwap-Cancel-uint256-address-]
- [`CancelUpTo(uint256 nonce, address signerWallet)`][ISwap-CancelUpTo-uint256-address-]
- [`AuthorizeSender(address authorizerAddress, address authorizedSender)`][ISwap-AuthorizeSender-address-address-]
- [`AuthorizeSigner(address authorizerAddress, address authorizedSigner)`][ISwap-AuthorizeSigner-address-address-]
- [`RevokeSender(address authorizerAddress, address revokedSender)`][ISwap-RevokeSender-address-address-]
- [`RevokeSigner(address authorizerAddress, address revokedSigner)`][ISwap-RevokeSigner-address-address-]


### <span id="ISwap-Swap-uint256-uint256-address-uint256-address-address-uint256-address-address-uint256-address-"></span> `Swap(uint256 nonce, uint256 timestamp, address signerWallet, uint256 signerParam, address signerToken, address senderWallet, uint256 senderParam, address senderToken, address affiliateWallet, uint256 affiliateParam, address affiliateToken)`
### <span id="ISwap-Cancel-uint256-address-"></span> `Cancel(uint256 nonce, address signerWallet)`
### <span id="ISwap-CancelUpTo-uint256-address-"></span> `CancelUpTo(uint256 nonce, address signerWallet)`
### <span id="ISwap-AuthorizeSender-address-address-"></span> `AuthorizeSender(address authorizerAddress, address authorizedSender)`
### <span id="ISwap-AuthorizeSigner-address-address-"></span> `AuthorizeSigner(address authorizerAddress, address authorizedSigner)`
### <span id="ISwap-RevokeSender-address-address-"></span> `RevokeSender(address authorizerAddress, address revokedSender)`
### <span id="ISwap-RevokeSigner-address-address-"></span> `RevokeSigner(address authorizerAddress, address revokedSigner)`
