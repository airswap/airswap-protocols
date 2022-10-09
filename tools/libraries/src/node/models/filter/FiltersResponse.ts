import { AmountLimitFilterResponse } from './AmountLimitFilterResponse'

export type FiltersResponse = {
  signerToken: Record<string, AmountLimitFilterResponse>
  senderToken: Record<string, AmountLimitFilterResponse>
}
