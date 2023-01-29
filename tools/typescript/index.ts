export type Signature = {
  v: string
  r: string
  s: string
}

export type UnsignedOrderERC20 = {
  nonce: string
  expiry: string
  signerWallet: string
  signerToken: string
  signerAmount: string
  protocolFee: string
  senderWallet: string
  senderToken: string
  senderAmount: string
}

export type OrderERC20 = {
  nonce: string
  expiry: string
  signerWallet: string
  signerToken: string
  signerAmount: string
  senderToken: string
  senderAmount: string
} & Signature

export type Settlement = {
  chainId: number
  swapContract: string
}

export type FullOrderERC20 = UnsignedOrderERC20 & Signature & Settlement

export type UnsignedOrder = {
  nonce: string
  expiry: string
  protocolFee: string
  signer: OrderParty
  sender: OrderParty
  affiliate: OrderParty
}

export type Order = UnsignedOrder & Signature

export type OrderParty = {
  wallet: string
  token: string
  kind: string
  id: string
  amount: string
}

export type UnsignedClaim = {
  nonce: string
  expiry: string
  participant: string
  score: string
}

export type Claim = {
  nonce: string
  expiry: string
  participant: string
  score: string
} & Signature

export type Token = {
  address: string
  symbol: string
  decimals: number
}

export type LocatorResult = {
  locators: Array<string>
  scores: Array<string>
  nextCursor: string
}

export const EIP712SwapERC20 = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ],
  Order: [
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
    { name: 'affiliate', type: 'Party' },
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

export { TokenInfo } from '@uniswap/token-lists'

export type Levels = [string, string][]
export type Formula = string

type LevelsOrFomulae =
  | {
      bid: Levels
      ask: Levels
    }
  | {
      bid: Formula
      ask: Formula
    }

export type Pricing = {
  baseToken: string
  quoteToken: string
  minimum?: string
} & LevelsOrFomulae
