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

export enum SortField {
  SIGNER_AMOUNT = 'SIGNER_AMOUNT',
  SENDER_AMOUNT = 'SENDER_AMOUNT',
  EXPIRY = 'EXPIRY',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export type OrderFilter = {
  signerWallet?: string
  signerMinAmount?: string
  signerMaxAmount?: string
  signerTokens?: string[]
  senderWallet?: string
  senderMinAmount?: string
  senderMaxAmount?: string
  senderTokens?: string[]
  sortField?: SortField
  sortOrder?: SortOrder
  offset: number
  limit: number
}

export type FiltersResponse = {
  signerToken: Record<string, AmountLimitFilterResponse>
  senderToken: Record<string, AmountLimitFilterResponse>
}

export type AmountLimitFilterResponse = {
  min: string
  max: string
}

export type IndexedOrder<Type> = {
  hash?: string | undefined
  order: Type
  addedOn: number
}

export type OrderResponse<Type> = {
  orders: Record<string, IndexedOrder<Type>>
  pagination: Pagination
}

export type Pagination = {
  limit: number
  offset: number
  resultsForQuery: number
}
