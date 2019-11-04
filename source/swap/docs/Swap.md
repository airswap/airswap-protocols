## <span id="Swap"></span> `Swap`

`Swap: The Atomic Swap used by the Swap Protocol`





### Features

**Authorizations** are for peers that trade on behalf of others. These peers are authorized by an individual to send or sign orders for them. Peers can be wallets (people or programs) or smart contracts.

**Affiliates** are third-parties compensated for their part in bringing together the two parties of a trade, and can be other traders or software applications that connect traders on the network.


### Functions

### <span id="Swap-constructor--"></span> `constructor()` (public)

Contract Constructor


Sets domain for signature validation (EIP-712)




### <span id="Swap-swap-struct-Types-Order-"></span> `swap(struct Types.Order order)` (external)

Atomic Token Swap



| Param             | Description       |
| ----------------- | :------------    |
|`order`|Types.Order Order to settle



### <span id="Swap-cancel-uint256---"></span> `cancel(uint256[] nonces)` (external)

Cancel one or more open orders by nonce


Cancelled nonces are marked UNAVAILABLE (0x01)
Emits a Cancel event

| Param             | Description       |
| ----------------- | :------------    |
|`nonces`|uint256[] List of nonces to cancel



### <span id="Swap-invalidate-uint256-"></span> `invalidate(uint256 minimumNonce)` (external)

Invalidate all orders below a nonce value


Emits an Invalidate event

| Param             | Description       |
| ----------------- | :------------    |
|`minimumNonce`|uint256 Minimum valid nonce



### <span id="Swap-authorizeSender-address-"></span> `authorizeSender(address authorizedSender)` (external)

Authorize a delegated sender


Emits an AuthorizeSender event

| Param             | Description       |
| ----------------- | :------------    |
|`authorizedSender`|address Address to authorize



### <span id="Swap-authorizeSigner-address-"></span> `authorizeSigner(address authorizedSigner)` (external)

Authorize a delegated signer


Emits an AuthorizeSigner event

| Param             | Description       |
| ----------------- | :------------    |
|`authorizedSigner`|address Address to authorize



### <span id="Swap-revokeSender-address-"></span> `revokeSender(address authorizedSender)` (external)

Revoke an authorized sender


Emits a RevokeSender event

| Param             | Description       |
| ----------------- | :------------    |
|`authorizedSender`|address Address to revoke



### <span id="Swap-revokeSigner-address-"></span> `revokeSigner(address authorizedSigner)` (external)

Revoke an authorized signer


Emits a RevokeSigner event

| Param             | Description       |
| ----------------- | :------------    |
|`authorizedSigner`|address Address to revoke



### <span id="Swap-isSenderAuthorized-address-address-"></span> `isSenderAuthorized(address authorizer, address delegate) → bool` (internal)

Determine whether a sender delegate is authorized



| Param             | Description       |
| ----------------- | :------------    |
|`authorizer`|address Address doing the authorization
|`delegate`|address Address being authorized


|  Param    | Description   |
|   ---------| :------------ |
| `bool`|  True if a delegate is authorized to send

### <span id="Swap-isSignerAuthorized-address-address-"></span> `isSignerAuthorized(address authorizer, address delegate) → bool` (internal)

Determine whether a signer delegate is authorized



| Param             | Description       |
| ----------------- | :------------    |
|`authorizer`|address Address doing the authorization
|`delegate`|address Address being authorized


|  Param    | Description   |
|   ---------| :------------ |
| `bool`|  True if a delegate is authorized to sign

### <span id="Swap-isValid-struct-Types-Order-bytes32-"></span> `isValid(struct Types.Order order, bytes32 domainSeparator) → bool` (internal)

Validate signature using an EIP-712 typed data hash



| Param             | Description       |
| ----------------- | :------------    |
|`order`|Types.Order Order to validate
|`domainSeparator`|bytes32 Domain identifier used in signatures (EIP-712)


|  Param    | Description   |
|   ---------| :------------ |
| `bool`|  True if order has a valid signature

### <span id="Swap-transferToken-address-address-uint256-address-bytes4-"></span> `transferToken(address from, address to, uint256 param, address token, bytes4 kind)` (internal)

Perform an ERC-20 or ERC-721 token transfer


Transfer type specified by the bytes4 kind param
ERC721: uses transferFrom for transfer
ERC20: Takes into account non-standard ERC-20 tokens.

| Param             | Description       |
| ----------------- | :------------    |
|`from`|address Wallet address to transfer from
|`to`|address Wallet address to transfer to
|`param`|uint256 Amount for ERC-20 or token ID for ERC-721
|`token`|address Contract address of token
|`kind`|bytes4 EIP-165 interface ID of the token




### Events

- [`Swap(uint256 nonce, uint256 timestamp, address signerWallet, uint256 signerParam, address signerToken, address senderWallet, uint256 senderParam, address senderToken, address affiliateWallet, uint256 affiliateParam, address affiliateToken)`][ISwap-Swap-uint256-uint256-address-uint256-address-address-uint256-address-address-uint256-address-]
- [`Cancel(uint256 nonce, address signerWallet)`][ISwap-Cancel-uint256-address-]
- [`Invalidate(uint256 nonce, address signerWallet)`][ISwap-Invalidate-uint256-address-]
- [`AuthorizeSender(address authorizerAddress, address authorizedSender)`][ISwap-AuthorizeSender-address-address-]
- [`AuthorizeSigner(address authorizerAddress, address authorizedSigner)`][ISwap-AuthorizeSigner-address-address-]
- [`RevokeSender(address authorizerAddress, address revokedSender)`][ISwap-RevokeSender-address-address-]
- [`RevokeSigner(address authorizerAddress, address revokedSigner)`][ISwap-RevokeSigner-address-address-]


