export class Pagination {
  public first: string
  public last: string
  public prev: string | undefined = undefined
  public next: string | undefined = undefined

  public constructor(
    first: string,
    last: string,
    next?: string,
    prev?: string
  ) {
    this.first = first
    this.last = last
    this.prev = prev
    this.next = next
  }
}
