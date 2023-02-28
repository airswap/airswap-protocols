import * as ethUtil from 'ethereumjs-util'

export function stringifyEIP712Type(
  types: { [key: string]: { type: string; name: string }[] },
  primaryType: string
): string {
  return types[primaryType].reduce((str, value, index, values) => {
    const isEnd = index !== values.length - 1
    return str + `${value.type} ${value.name}${isEnd ? ',' : ')'}`
  }, `${primaryType}(`)
}

export const EIP712SwapERC20 = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ],
  OrderERC20: [
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
    { name: 'signerWallet', type: 'address' },
    { name: 'signerToken', type: 'address' },
    { name: 'signerAmount', type: 'uint256' },
    { name: 'protocolFee', type: 'uint256' },
    { name: 'senderWallet', type: 'address' },
    { name: 'senderToken', type: 'address' },
    { name: 'senderAmount', type: 'uint256' },
  ],
}

export const EIP712Swap = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ],
  Order: [
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
    { name: 'protocolFee', type: 'uint256' },
    { name: 'signer', type: 'Party' },
    { name: 'sender', type: 'Party' },
    { name: 'affiliateWallet', type: 'address' },
    { name: 'affiliateAmount', type: 'uint256' },
  ],
  Party: [
    { name: 'wallet', type: 'address' },
    { name: 'token', type: 'address' },
    { name: 'kind', type: 'bytes4' },
    { name: 'id', type: 'uint256' },
    { name: 'amount', type: 'uint256' },
  ],
}

export const EIP712Claim = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ],
  Claim: [
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
    { name: 'participant', type: 'address' },
    { name: 'score', type: 'uint256' },
  ],
}

export const SWAP_DOMAIN_TYPEHASH = ethUtil.keccak256(
  stringifyEIP712Type(EIP712Swap, 'EIP712Domain')
)
export const SWAP_ORDER_TYPEHASH = ethUtil.keccak256(
  stringifyEIP712Type(EIP712Swap, 'Order')
)
export const SWAP_PARTY_TYPEHASH = ethUtil.keccak256(
  stringifyEIP712Type(EIP712Swap, 'Party')
)

export const SWAP_ERC20_DOMAIN_TYPEHASH = ethUtil.keccak256(
  stringifyEIP712Type(EIP712SwapERC20, 'EIP712Domain')
)
export const SWAP_ERC20_ORDER_TYPEHASH = ethUtil.keccak256(
  stringifyEIP712Type(EIP712SwapERC20, 'OrderERC20')
)
