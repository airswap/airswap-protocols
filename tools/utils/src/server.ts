export type ServerOptions = {
  chainId?: number
  swapContract?: string
  initializeTimeout?: number
  staker?: string
}

export type SupportedProtocolInfo = {
  interfaceId: string
  params: {
    chainId: number
    swapContractAddress: string
    walletAddress: string
    senderServer?: string
    senderWallet?: string
  }
}

export type OrderFilter = {
  chainId?: number
  signerWallet?: string
  signerToken?: string
  signerId?: string
  senderWallet?: string
  senderToken?: string
  minSignerAmount?: string
  maxSignerAmount?: string
  minSenderAmount?: string
  maxSenderAmount?: string
  tags?: string[]
}

export type OrderResponse<OrderType> = {
  orders: OrderType[]
  offset: number
  total: number
}

export enum Indexes {
  NONCE = 'NONCE',
  EXPIRY = 'EXPIRY',
  SIGNER_AMOUNT = 'SIGNER_AMOUNT',
  SENDER_AMOUNT = 'SENDER_AMOUNT',
}

export enum Direction {
  ASC = 'ASC',
  DESC = 'DESC',
}
