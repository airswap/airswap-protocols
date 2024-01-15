export type ServerOptions = {
  chainId?: number
  swapContract?: string
  initializeTimeout?: number
}

export type SupportedProtocolInfo = {
  name: string
  version: string
  params?: any
}

export type OrderERC20Filter = {
  chainId?: number
  signerWallet?: string
  signerToken?: string
  senderWallet?: string
  senderToken?: string
}

export type OrderFilter = {
  signerId?: string
} & OrderERC20Filter

export type OrderResponse<OrderType> = {
  orders: OrderType[]
  offset: number
  limit: number
}

export enum Indexes {
  NONCE = 'nonce',
  EXPIRY = 'expiry',
  SIGNER_WALLET = 'signerWallet',
  SIGNER_TOKEN = 'signerToken',
  SIGNER_AMOUNT = 'signerAmount',
  SIGNER_ID = 'signerId',
  SENDER_TOKEN = 'senderToken',
  SENDER_AMOUNT = 'senderAmount',
}

export enum Direction {
  ASC = 'asc',
  DESC = 'desc',
}
