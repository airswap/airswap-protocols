import { FullOrder } from '@airswap/typescript'

export class IndexedOrderResponse {
  public hash: string | undefined
  public order: FullOrder
  public addedOn: number

  public constructor(fullOrder: FullOrder, addedOn: number, hash?: string) {
    this.hash = hash
    this.order = fullOrder
    this.addedOn = addedOn
  }
}
