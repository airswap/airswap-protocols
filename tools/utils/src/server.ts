export type ServerOptions = {
  chainId?: number
  swapContract?: string
  initializeTimeout?: number
  staker?: string
}

export type SupportedProtocolInfo = {
  name: string
  version: string
  params?: any
}

export type OrderFilter = {
  chainId?: number
  signerWallet?: string
  signerToken?: string
  signerId?: string
  senderWallet?: string
  senderToken?: string
  tags?: string[]
}

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
