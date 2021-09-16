import { fancy } from 'fancy-test'
import chai, { expect } from 'chai'
import sinonChai from 'sinon-chai'
import { spy } from 'sinon'
import mock from 'mock-require'
import { WebSocket, Server as MockSocketServer } from 'mock-socket'
import { JsonRpcRequest } from 'jsonrpc-client-websocket'

import { createQuote, createLightOrder } from '@airswap/utils'
import { ADDRESS_ZERO } from '@airswap/constants'

import { Server } from '..'

const badQuote = { bad: 'quote' }
const emptyQuote = createQuote({})
const URL = 'maker.example.com'

chai.use(sinonChai)

const jsonRpcVersion = '2.0'

function createRequest(
  method: string,
  params?: any,
  id?: number
): JsonRpcRequest {
  return {
    jsonrpc: jsonRpcVersion,
    id: id,
    method: method,
    params: params,
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
  const url = `ws://maker.com:1234`
  before(async () => {
    mock('websocket', { client: WebSocket })
    const server = new MockSocketServer(url)

    server.on('connection', (socket) => {
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
                  senderServer: '0x1234',
                },
                id: 1,
              },
            ],
          ])
        )
      )
    })
  })

  it('Should initialize', async () => {
    const client = (await Server.for(url)) as Server
    expect(client.supportsProtocol('last-look')).to.equal(true)
  })

  after(() => {
    // server.close()
  })
})
