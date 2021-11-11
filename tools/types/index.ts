import {
  tokenKinds,
  signatureTypes,
  ADDRESS_ZERO,
  LOCATOR_ZERO,
} from '@airswap/constants'

export type Party = {
  kind: string
  token: string
  id?: string
  amount?: string
}

export type OrderParty = Party & {
  wallet: string
}

export type Quote = {
  timestamp?: string
  protocol?: string
  locator?: string
  signer: Party
  sender: Party
}

export type UnsignedOrder = {
  nonce: string
  expiry: string
  signer: OrderParty
  sender: OrderParty
  affiliate: OrderParty
}

export type Signature = {
  version: string
  signatory: string
  validator: string
  v: string
  r: string
  s: string
}

export type Order = UnsignedOrder & {
  signature: Signature
}

export type LightSignature = {
  v: string
  r: string
  s: string
}

export type UnsignedLightOrder = {
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

export type LightOrder = {
  nonce: string
  expiry: string
  signerWallet: string
  signerToken: string
  signerAmount: string
  senderToken: string
  senderAmount: string
} & LightSignature

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

export const EIP712 = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'verifyingContract', type: 'address' },
  ],
  Order: [
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
    { name: 'signer', type: 'Party' },
    { name: 'sender', type: 'Party' },
    { name: 'affiliate', type: 'Party' },
  ],
  Party: [
    { name: 'kind', type: 'bytes4' },
    { name: 'wallet', type: 'address' },
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'id', type: 'uint256' },
  ],
}

export const EIP712Light = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ],
  LightOrder: [
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

export const emptyParty: Party = {
  kind: tokenKinds.ERC20,
  token: ADDRESS_ZERO,
  amount: '0',
  id: '0',
}

export const emptyOrderParty: OrderParty = {
  wallet: ADDRESS_ZERO,
  kind: tokenKinds.ERC20,
  token: ADDRESS_ZERO,
  amount: '0',
  id: '0',
}

export const emptySignature: Signature = {
  version: signatureTypes.PERSONAL_SIGN,
  signatory: ADDRESS_ZERO,
  validator: ADDRESS_ZERO,
  r: LOCATOR_ZERO,
  s: LOCATOR_ZERO,
  v: '0',
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
