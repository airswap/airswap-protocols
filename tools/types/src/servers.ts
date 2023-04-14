export type SupportedProtocolInfo = {
  name: string
  version: string
  params?: any
}

export type ServerOptions = {
  chainId?: number
  swapContract?: string
  initializeTimeout?: number
}

export enum SortField {
  SIGNER_AMOUNT = 'SIGNER_AMOUNT',
  SENDER_AMOUNT = 'SENDER_AMOUNT',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export type RequestFilter = {
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

export type FiltersResponse = {
  signerToken: Record<string, AmountLimitFilterResponse>
  senderToken: Record<string, AmountLimitFilterResponse>
}

export type AmountLimitFilterResponse = {
  min: string
  max: string
}
