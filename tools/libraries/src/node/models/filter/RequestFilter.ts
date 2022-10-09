import { SortField } from './SortField'
import { SortOrder } from './SortOrder'

export class RequestFilter {
  public signerTokens?: string[]
  public senderTokens?: string[]
  public minSignerAmount?: bigint
  public maxSignerAmount?: bigint
  public minSenderAmount?: bigint
  public maxSenderAmount?: bigint
  public page!: number
  public sortField?: SortField
  public sortOrder?: SortOrder
  public maxAddedDate?: number
}
