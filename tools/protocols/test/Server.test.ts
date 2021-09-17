import { fancy } from 'fancy-test'
import chai, { expect, util, Assertion } from 'chai'
import sinonChai from 'sinon-chai'
// import { spy } from 'sinon'
import mock from 'mock-require'
import { WebSocket, Server as MockSocketServer } from 'mock-socket'
import { JsonRpcRequest, JsonRpcResponse } from 'jsonrpc-client-websocket'

import { createQuote, createLightOrder } from '@airswap/utils'
import { ADDRESS_ZERO } from '@airswap/constants'

import { Server } from '..'

const badQuote = { bad: 'quote' }
const emptyQuote = createQuote({})
const URL = 'maker.example.com'

chai.use(sinonChai)

util.addProperty(Assertion.prototype, 'JSONRpcRequest', function () {
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

function createRequest(
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

function createResponse(id: number, result: any): JsonRpcResponse {
  return {
    jsonrpc: jsonRpcVersion,
    id,
    result,
  }
}

function mockServer(api) {
  api.post('/').reply(200, async (uri, body) => {
    const params = body['params']
    let res
    switch (body['method']) {
      case 'getMaxQuote':
        res = emptyQuote
        break
      case 'getSignerSideQuote':
        res = badQuote
        break
      case 'getSenderSideQuote':
        res = createQuote({
          signer: {
            token: params.signerToken,
            amount: params.signerAmount,
          },
          sender: {
            token: params.senderToken,
          },
        })
        break
      case 'getSignerSideOrder':
        res = createLightOrder({
          signerToken: params.signerToken,
          senderToken: params.senderToken,
          senderAmount: params.senderAmount,
          senderWallet: params.senderWallet,
        })
        break
    }
    return {
      jsonrpc: '2.0',
      id: body['id'],
      result: res,
    }
  })
}

describe('HTTPServer', () => {
  fancy
    .nock('https://' + URL, mockServer)
    .do(async () => {
      const server = await Server.for(URL)
      await server.getSignerSideQuote('', '', '')
    })
    .catch(/Server response is not a valid quote: {"bad":"quote"}/)
    .it('Server getSignerSideQuote() throws')
  fancy
    .nock('https://' + URL, mockServer)
    .do(async () => {
      const server = await Server.for(URL)
      await server.getMaxQuote('', '')
    })
    .catch(
      /Server response differs from request params: signerToken,senderToken/
    )
    .it('Server getMaxQuote() throws')
  fancy
    .nock('https://' + URL, mockServer)
    .it('Server getSenderSideQuote()', async () => {
      const server = await Server.for(URL)
      const quote = await server.getSenderSideQuote('1', 'SIGNERTOKEN', '')
      expect(quote.signer.token).to.equal('SIGNERTOKEN')
    })
  fancy
    .nock('https://' + URL, mockServer)
    .it('Server getSignerSideOrder()', async () => {
      const server = await Server.for(URL)
      const order = await server.getSignerSideOrder(
        '0',
        ADDRESS_ZERO,
        ADDRESS_ZERO,
        ADDRESS_ZERO
      )
      expect(order.signerToken).to.equal(ADDRESS_ZERO)
    })
})

describe.only('WebSocketServer', () => {
  describe('Positive case', () => {
    const url = `ws://maker.com:1234`
    let mockServer: MockSocketServer
    let messageCallback: (socket: WebSocket, data: any) => void
    let client: Server
    before(async () => {
      mock('websocket', { client: WebSocket })
      mockServer = new MockSocketServer(url)

      mockServer.on('connection', (socket) => {
        socket.send(
          JSON.stringify(
            createRequest('initialize', [
              [
                {
                  name: 'last-look',
                  version: '1.0.0',
                  params: {
                    swapContract: '0x1234',
                    senderWallet: '0x1234',
                    senderServer: 'www.makersender.com',
                  },
                },
              ],
            ])
          )
        )
        socket.on('message', (data) => {
          if (messageCallback) {
            messageCallback(socket, data)
          }
        })
      })
    })

    it('Should be initialized after Server.for has resolved', async () => {
      client = await Server.for(url)
      expect(client.supportsProtocol('last-look')).to.equal(true)
      expect(client.supportsProtocol('request-for-quote')).to.equal(false)
    })

    it('Should call subscribe with the correct params and emit pricing', (done) => {
      const samplePricing = [
        {
          baseToken: '0xbase1',
          quoteToken: '0xquote1',
          bid: [
            ['100', '0.00053'],
            ['1000', '0.00061'],
            ['10000', '0.0007'],
          ],
          ask: [
            ['100', '0.00055'],
            ['1000', '0.00067'],
            ['10000', '0.0008'],
          ],
        },
        {
          baseToken: '0xbase2',
          quoteToken: '0xquote2',
          bid: [
            ['100', '0.00053'],
            ['1000', '0.00061'],
            ['10000', '0.0007'],
          ],
          ask: [
            ['100', '0.00055'],
            ['1000', '0.00067'],
            ['10000', '0.0008'],
          ],
        },
      ]
      const onPricing = (pricing) => {
        try {
          expect(pricing).to.eql(samplePricing)
          done()
        } catch (e) {
          done(e)
        }
      }
      const onSubscribe = (socket, data) => {
        const parseData = JSON.parse(data) as JsonRpcRequest
        socket.send(
          JSON.stringify(createResponse(parseData.id, [samplePricing]))
        )
      }

      messageCallback = onSubscribe

      client.on('pricing', onPricing)
      client.subscribe([
        {
          baseToken: '0xbase1',
          quoteToken: '0xquote1',
        },
        {
          baseToken: '0xbase2',
          quoteToken: '0xquote2',
        },
      ])
    })
    after(() => {
      mock.stop('websocket')
      mockServer.close()
    })
  })
})
