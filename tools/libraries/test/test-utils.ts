import type { EventEmitter } from 'node:events'
import type {
  JsonRpcRequest,
  JsonRpcResponse,
} from '@airswap/jsonrpc-client-websocket'
import { ProtocolIds } from '@airswap/utils'
import chai from 'chai'
import mock from 'mock-require'
import { Server as BaseMockSocketServer, WebSocket } from 'mock-socket'

export function addJSONRPCAssertions(): void {
  chai.Assertion.addMethod(
    'JSONRpcRequest',
    function (method?: string, params?: any) {
      const obj = this._obj
      const keys = Object.keys(obj)
      const required = ['jsonrpc', 'method', 'id']
      const optional = ['params']
      if (method) {
        new chai.Assertion(this._obj.method).to.equal(method)
      }

      if (params) {
        new chai.Assertion(this._obj.params).to.eql(params)
      }

      this.assert(
        keys.every((k) => required.concat(optional).includes(k)) &&
          required.every((k) => keys.includes(k)),
        'expected #{this} to be a JSONRpcRequest',
        'expected #{this} not to be a JSONRpcRequest',
        obj
      )
    }
  )

  chai.Assertion.addMethod('JSONRpcResponse', function (id: any, result: any) {
    const obj = this._obj
    const keys = Object.keys(obj)
    const required = ['jsonrpc', 'id', 'result']
    new chai.Assertion(this._obj.id).to.equal(id)
    new chai.Assertion(this._obj.result).to.eql(result)
    this.assert(
      keys.every((k) => required.includes(k)) &&
        required.every((k) => keys.includes(k)),
      'expected #{this} to be a JSONRpcResult',
      'expected #{this} not to be a JSONRpcResult',
      obj
    )
  })

  chai.Assertion.addMethod('JSONRpcError', function (id: any, error: any) {
    const obj = this._obj
    const keys = Object.keys(obj)
    const required = ['jsonrpc', 'id', 'error']
    new chai.Assertion(this._obj.id).to.equal(id)
    new chai.Assertion(this._obj.error).to.eql(error)
    this.assert(
      keys.every((k) => required.includes(k)) &&
        required.every((k) => keys.includes(k)),
      'expected #{this} to be a JSONRpcError',
      'expected #{this} not to be a JSONRpcError',
      obj
    )
  })
}

const jsonRpcVersion = '2.0'

export function createRequest(
  method: string,
  params?: Record<string, string> | Array<any>,
  id?: string
): JsonRpcRequest {
  return {
    jsonrpc: jsonRpcVersion,
    id,
    method,
    params,
  }
}

export function createResponse(
  id: number,
  result: Record<string, unknown> | boolean | Array<any>
): JsonRpcResponse {
  return {
    jsonrpc: jsonRpcVersion,
    id,
    result,
  }
}

export async function nextEvent(
  client: EventEmitter,
  eventName: string
): Promise<unknown> {
  const promise = new Promise((resolve) => {
    client.on(eventName, function resolvePromiseAndRemove(data) {
      resolve(data)
      client.off(eventName, resolvePromiseAndRemove)
    })
  })
  return promise
}

export class MockSocketServer extends BaseMockSocketServer {
  private nextMessageCallback: {
    callback: (socket: WebSocket, data: any) => void
    ignoreResponses: boolean
  } | null
  private _initOptions: {
    lastLook?: string
    rfq?: string
    params?: any
  } | null

  public constructor(url: string) {
    super(url)
    this.resetInitOptions()
    this.on('connection', (socket) => {
      const protocols: any = []
      if (this._initOptions) {
        if (this._initOptions.lastLook)
          protocols.push({
            name: ProtocolIds.LastLookERC20,
            version: this._initOptions.lastLook,
            params: this._initOptions.params,
          })
        if (this._initOptions.rfq)
          protocols.push({
            name: ProtocolIds.RequestForQuoteERC20,
            version: this._initOptions.rfq,
            params: this._initOptions.params,
          })
        socket.send(
          JSON.stringify(createRequest('setProtocols', [protocols], '123'))
        )
      }

      socket.on('message', this.onMessage.bind(this, socket))
    })
  }

  public set initOptions(options: {
    lastLook?: string
    rfq?: string
    params?: any
  }) {
    this._initOptions = options
  }

  public static startMockingWebSocket(): void {
    mock('websocket', { w3cwebsocket: WebSocket })
  }

  public static stopMockingWebSocket(): void {
    mock.stop('websocket')
  }

  public resetInitOptions(): void {
    this.initOptions = {
      lastLook: '1.0.0',
      rfq: undefined,
      params: {
        swapContract: '0x1234',
        senderWallet: '0x2345',
      },
    }
  }

  public setNextMessageCallback(
    cb: (socket: WebSocket, data: any) => void,
    ignoreResponses?: boolean
  ): void {
    this.nextMessageCallback = {
      callback: cb,
      ignoreResponses: !!ignoreResponses,
    }
  }

  private onMessage(socket: WebSocket, data) {
    const parsedData = JSON.parse(data.toString())
    if (this.nextMessageCallback) {
      if (
        this.nextMessageCallback.ignoreResponses &&
        (parsedData.result || parsedData.error)
      ) {
        return // ignore this response.
      }
      this.nextMessageCallback.callback(socket, parsedData)
      this.nextMessageCallback = null
    }
  }
}
