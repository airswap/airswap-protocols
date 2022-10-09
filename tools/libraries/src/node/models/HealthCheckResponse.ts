export class HealthCheckResponse {
  public peers: string[]
  public registry: string
  public databaseOrders: number

  public constructor(
    peers: string[],
    registry: string,
    databaseOrders: number
  ) {
    this.peers = peers
    this.registry = registry
    this.databaseOrders = databaseOrders
  }
}
