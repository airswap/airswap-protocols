import chai from 'chai'
import {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
} from 'jsonrpc-client-websocket'
import mock from 'mock-require'
import { WebSocket, Server } from 'mock-socket'

chai.util.addProperty(chai.Assertion.prototype, 'JSONRpcRequest', function () {
  const obj = this._obj
  const keys = Object.keys(obj)
  const required = ['jsonrpc', 'method', 'params', 'id']
  this.assert(
    keys.every((k) => required.includes(k)) &&
      required.every((k) => keys.includes(k)),
    'expected #{this} to be a JSONRpcRequest',
    'expected #{this} not to be a JSONRpcRequest'
  )
})

const jsonRpcVersion = '2.0'

export function createRequest(
  method: string,
  params?: any,
  id?: number
): JsonRpcRequest {
  return {
    jsonrpc: jsonRpcVersion,
    id,
    method,
    params,
  }
}

export function createResponse(id: number, result: any): JsonRpcResponse {
  return {
    jsonrpc: jsonRpcVersion,
    id,
    result,
  }
}

export class MockSocketServer extends Server {
  private nextMessageCallback: (socket: WebSocket, data: any) => void
  private _initOptions: {
    lastLook?: string
    rfq?: string
    params?: any
  } | null = {
    lastLook: '1.0.0',
    rfq: '1.0.0',
    params: {
      swapContract: '0x1234',
      senderWallet: '0x2345',
    },
  }

  public set initOptions(options: {
    lastLook?: string
    rfq?: string
    params?: any
  }) {
    this._initOptions = options
  }

  public constructor(url: string) {
    super(url)
    this.on('connection', (socket) => {
      const protocols = []
      if (this._initOptions) {
        if (this._initOptions.lastLook)
          protocols.push({
            name: 'last-look',
            version: this._initOptions.lastLook,
            params: this._initOptions.params,
          })
        if (this._initOptions.rfq)
          protocols.push({
            name: 'last-look',
            version: this._initOptions.rfq,
            params: this._initOptions.params,
          })
        socket.send(JSON.stringify(createRequest('initialize', [protocols])))
      }

      socket.on('message', this.onMessage.bind(this, socket))
    })
  }

  public static startMockingWebSocket() {
    mock('websocket', { client: WebSocket })
  }

  public static stopMockingWebSocket() {
    mock.stop('websocket')
  }

  public setNextMessageCallback(cb: (socket: WebSocket, data: any) => void) {
    this.nextMessageCallback = cb
  }

  private onMessage(socket: WebSocket, data) {
    const parsedData = JSON.parse(data.toString()) as
      | JsonRpcRequest
      | JsonRpcResponse
      | JsonRpcError
    if (this.nextMessageCallback) {
      this.nextMessageCallback(socket, parsedData)
      this.nextMessageCallback = null
    }
  }
}
