import { fancy } from 'fancy-test'
import chai, { expect } from 'chai'
import sinonChai from 'sinon-chai'
// import { spy } from 'sinon'

import { createQuote, createLightOrder } from '@airswap/utils'
import { ADDRESS_ZERO } from '@airswap/constants'

import { Server } from '..'
import {
  addJSONRPCAssertions,
  createRequest,
  createResponse,
  MockSocketServer,
  nextEvent,
} from './test-utils'
import { LightOrder } from '@airswap/types'

const badQuote = { bad: 'quote' }
const emptyQuote = createQuote({})
const URL = 'maker.example.com'

chai.use(sinonChai)
addJSONRPCAssertions()

function mockHttpServer(api) {
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
      case 'consider':
        res = true
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
    .nock('https://' + URL, mockHttpServer)
    .do(async () => {
      const server = await Server.for(URL)
      await server.getSignerSideQuote('', '', '')
    })
    .catch(/Server response is not a valid quote: {"bad":"quote"}/)
    .it('Server getSignerSideQuote() throws')
  fancy
    .nock('https://' + URL, mockHttpServer)
    .do(async () => {
      const server = await Server.for(URL)
      await server.getMaxQuote('', '')
    })
    .catch(
      /Server response differs from request params: signerToken,senderToken/
    )
    .it('Server getMaxQuote() throws')
  fancy
    .nock('https://' + URL, mockHttpServer)
    .it('Server getSenderSideQuote()', async () => {
      const server = await Server.for(URL)
      const quote = await server.getSenderSideQuote('1', 'SIGNERTOKEN', '')
      expect(quote.signer.token).to.equal('SIGNERTOKEN')
    })
  fancy
    .nock('https://' + URL, mockHttpServer)
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

const samplePairs = [
  {
    baseToken: '0xbase1',
    quoteToken: '0xquote1',
  },
  {
    baseToken: '0xbase2',
    quoteToken: '0xquote2',
  },
]
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
const fakeOrder: LightOrder = {
  nonce: '1',
  expiry: '1234',
  signerWallet: '0xsigner',
  signerToken: '0xtokena',
  signerAmount: '100',
  senderToken: '0xtokenb',
  senderAmount: '200',
  v: 'v',
  r: 'r',
  s: 's',
}

describe.only('WebSocketServer', () => {
  const url = `ws://maker.com:1234/`
  let mockServer: MockSocketServer
  before(() => {
    MockSocketServer.startMockingWebSocket()
  })

  beforeEach(async () => {
    mockServer = new MockSocketServer(url)
  })

  it('should be initialized after Server.for has resolved', async () => {
    const client = await Server.for(url)
    expect(client.supportsProtocol('last-look')).to.equal(true)
    expect(client.supportsProtocol('request-for-quote')).to.equal(false)
  })

  it('should call subscribe with the correct params and emit pricing', async () => {
    const client = await Server.for(url)

    // Ensure subscribe method is correct format.
    const onSubscribe = (socket, data) => {
      // @ts-ignore
      expect(data).to.be.a.JSONRpcRequest('subscribe', [samplePairs])
      socket.send(JSON.stringify(createResponse(data.id, samplePricing)))
    }
    mockServer.setNextMessageCallback(onSubscribe)
    const pricing = nextEvent(client, 'pricing')
    client.subscribe(samplePairs)

    // Ensure pricing is emitted and has the correct values.
    expect(await pricing).to.eql(samplePricing)

    const updatedPricing = nextEvent(client, 'pricing')
    const latestPricing = [
      [
        {
          baseToken: '0xbase1',
          quoteToken: '0xquote1',
          bid: [
            ['100', '0.00055'],
            ['1000', '0.00064'],
            ['10000', '0.0008'],
          ],
          ask: [
            ['100', '0.00056'],
            ['1000', '0.00068'],
            ['10000', '0.0009'],
          ],
        },
      ],
    ]

    // Ensure updatePricing is correctly called and causes pricing to be emitted
    mockServer.emit(
      'message',
      JSON.stringify(createRequest('updatePricing', latestPricing))
    )
    expect(await updatedPricing).to.eql(latestPricing[0])
  })

  it('should call consider with the correct parameters', async () => {
    const client = await Server.for(url)
    const onConsider = (socket, data) => {
      // @ts-ignore
      expect(data).to.be.a.JSONRpcRequest('consider', fakeOrder)
      socket.send(JSON.stringify(createResponse(data.id, true)))
    }
    mockServer.setNextMessageCallback(onConsider)
    const result = await client.consider(fakeOrder)
    expect(result).to.equal(true)
  })

  fancy
    .nock('https://' + URL, mockHttpServer)
    .it(
      'should use HTTP for consider when senderServer is provided',
      async () => {
        mockServer.initOptions = {
          lastLook: '1.0.0',
          params: {
            swapContract: '0x1234',
            senderWallet: '0x2345',
            senderServer: URL,
          },
        }

        const client = await Server.for(url)
        const result = await client.consider(fakeOrder)
        expect(result).to.equal(true)
      }
    )

  it('should call unsubscribe with the correct parameters', async () => {
    const client = await Server.for(url)
    const onUnsubscribe = (socket, data) => {
      // @ts-ignore
      expect(data).to.be.a.JSONRpcRequest('unsubscribe', [samplePairs])
      socket.send(JSON.stringify(createResponse(data.id, true)))
    }
    mockServer.setNextMessageCallback(onUnsubscribe)
    const result = await client.unsubscribe(samplePairs)
    expect(result).to.equal(true)
  })

  it('should call subscribeAll and unsubscribeAll correctly', async () => {
    const client = await Server.for(url)
    const onSubscribeAll = (socket, data) => {
      // @ts-ignore
      expect(data).to.be.a.JSONRpcRequest('subscribeAll')
      socket.send(JSON.stringify(createResponse(data.id, true)))
    }
    const onUnsubscribeAll = (socket, data) => {
      // @ts-ignore
      expect(data).to.be.a.JSONRpcRequest('unsubscribeAll')
      socket.send(JSON.stringify(createResponse(data.id, true)))
    }
    mockServer.setNextMessageCallback(onSubscribeAll)
    const subscribeResult = await client.subscribeAll()
    expect(subscribeResult).to.equal(true)
    mockServer.setNextMessageCallback(onUnsubscribeAll)
    const unsubscribeResult = await client.unsubscribeAll()
    expect(unsubscribeResult).to.equal(true)
  })

  afterEach(() => {
    mockServer.close()
  })
  after(() => {
    MockSocketServer.stopMockingWebSocket()
  })
})
