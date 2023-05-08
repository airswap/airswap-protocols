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

export type RequestFilterERC20 = {
  signerTokens?: string[]
  senderTokens?: string[]
  minSignerAmount?: bigint
  maxSignerAmount?: bigint
  minSenderAmount?: bigint
  maxSenderAmount?: bigint
  page: number
  sortField?: SortField
  sortOrder?: SortOrder
  maxAddedDate?: number
}

export type RequestFilter = {
  sortField?: SortField
  sortOrder?: SortOrder
  signerAddress?: string
  senderAddress?: string
  page: number
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
  filters?: FiltersResponse | undefined
  ordersForQuery: number
}

export type Pagination = {
  first: string
  last: string
  prev?: string | undefined
  next?: string | undefined
}
