import { fancy } from 'fancy-test'
import chai, { expect } from 'chai'
import sinonChai from 'sinon-chai'
import { useFakeTimers } from 'sinon'

import { createOrderERC20 } from '@airswap/utils'
import { ADDRESS_ZERO } from '@airswap/constants'

import { Maker } from '..'
import {
  addJSONRPCAssertions,
  createRequest,
  createResponse,
  MockSocketServer,
  nextEvent,
} from './test-utils'
import { OrderERC20 } from '@airswap/types'
import { JsonRpcErrorCodes } from '@airswap/jsonrpc-client-websocket'

addJSONRPCAssertions()
declare global {
  // External library defines a namespace so ignore this rule.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace Chai {
    interface Assertion {
      JSONRpcRequest(method: string, params?: any): void
      JSONRpcResponse(id: string, result: any): void
      JSONRpcError(id: string, error: any): void
    }
  }
}

const REQUEST_TIMEOUT = 4000
const URL = 'maker.example.com'

chai.use(sinonChai)

function mockHttpMaker(api) {
  api.post('/').reply(200, async (uri, body) => {
    const params = body['params']
    let res
    switch (body['method']) {
      case 'getSignerSideOrder':
        res = createOrderERC20({
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

describe('HTTPMaker', () => {
  fancy
    .nock('https://' + URL, mockHttpMaker)
    .it('Maker getSignerSideOrder()', async () => {
      const server = await Maker.at(URL)
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
const fakeOrder: OrderERC20 = {
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

describe('WebSocketMaker', () => {
  const url = `ws://maker.com:1234/`
  let mockMaker: MockSocketServer
  before(() => {
    MockSocketServer.startMockingWebSocket()
  })

  beforeEach(async () => {
    mockMaker = new MockSocketServer(url)
    mockMaker.resetInitOptions()
  })

  it('should be initialized after Maker.at has resolved', async () => {
    const server = await Maker.at(url)
    const correctInitializeResponse = new Promise<void>((resolve) => {
      const onResponse = (socket, data) => {
        // Note mock server implementation uses id '123' for initialize.
        expect(data).to.be.a.JSONRpcResponse('123', true)
        resolve()
      }
      mockMaker.setNextMessageCallback(onResponse)
    })
    expect(server.supportsProtocol('last-look')).to.equal(true)
    expect(server.supportsProtocol('request-for-quote')).to.equal(false)
    await correctInitializeResponse
  })

  it('should call subscribe with the correct params and emit pricing', async () => {
    const server = await Maker.at(url)

    // Ensure subscribe method is correct format.
    const onSubscribe = (socket, data) => {
      expect(data).to.be.a.JSONRpcRequest('subscribe', [samplePairs])
      socket.send(JSON.stringify(createResponse(data.id, samplePricing)))
    }
    mockMaker.setNextMessageCallback(onSubscribe, true)
    const pricing = nextEvent(server, 'pricing')
    server.subscribe(samplePairs)

    // Ensure pricing is emitted and has the correct values.
    expect(await pricing).to.eql(samplePricing)

    const updatedPricing = nextEvent(server, 'pricing')
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

    const updatePricingRequestId = '456'
    // Ensure client responds to server correctly when pricing is updated
    const correctUpdatePricingResponse = new Promise<void>((resolve) => {
      const onResponse = (socket, data) => {
        expect(data).to.be.a.JSONRpcResponse(updatePricingRequestId, true)
        resolve()
      }
      mockMaker.setNextMessageCallback(onResponse)
    })

    // Ensure updatePricing is correctly called and causes pricing to be emitted
    mockMaker.emit(
      'message',
      JSON.stringify(
        createRequest('updatePricing', latestPricing, updatePricingRequestId)
      )
    )
    expect(await updatedPricing).to.eql(latestPricing[0])
    await correctUpdatePricingResponse
  })

  it('should call consider with the correct parameters', async () => {
    const server = await Maker.at(url)
    const onConsider = (socket, data) => {
      expect(data).to.be.a.JSONRpcRequest('consider', fakeOrder)
      socket.send(JSON.stringify(createResponse(data.id, true)))
    }
    mockMaker.setNextMessageCallback(onConsider, true)
    const result = await server.consider(fakeOrder)
    expect(result).to.equal(true)
  })

  fancy
    .nock('https://' + URL, mockHttpMaker)
    .it(
      'should use HTTP for consider when senderMaker is provided',
      async () => {
        mockMaker.initOptions = {
          lastLook: '1.0.0',
          params: {
            swapContract: '0x1234',
            senderWallet: '0x2345',
            senderMaker: URL,
          },
        }

        const server = await Maker.at(url)
        const result = await server.consider(fakeOrder)
        expect(result).to.equal(true)
      }
    )

  it('should call unsubscribe with the correct parameters', async () => {
    const server = await Maker.at(url)
    const onUnsubscribe = (socket, data) => {
      expect(data).to.be.a.JSONRpcRequest('unsubscribe', [samplePairs])
      socket.send(JSON.stringify(createResponse(data.id, true)))
    }
    mockMaker.setNextMessageCallback(onUnsubscribe, true)
    const result = await server.unsubscribe(samplePairs)
    expect(result).to.equal(true)
  })

  it('should call subscribeAll and unsubscribeAll correctly', async () => {
    const server = await Maker.at(url)
    const onSubscribeAll = (socket, data) => {
      expect(data).to.be.a.JSONRpcRequest('subscribeAll')
      socket.send(JSON.stringify(createResponse(data.id, true)))
    }
    const onUnsubscribeAll = (socket, data) => {
      expect(data).to.be.a.JSONRpcRequest('unsubscribeAll')
      socket.send(JSON.stringify(createResponse(data.id, true)))
    }
    mockMaker.setNextMessageCallback(onSubscribeAll, true)
    const subscribeResult = await server.subscribeAll()
    expect(subscribeResult).to.equal(true)
    mockMaker.setNextMessageCallback(onUnsubscribeAll, true)
    const unsubscribeResult = await server.unsubscribeAll()
    expect(unsubscribeResult).to.equal(true)
  })

  it("should throw if the server doesn't initialize within timeout", async () => {
    const fakeTimers = useFakeTimers()
    // prevent server from initializing
    mockMaker.initOptions = null
    const initializePromise = Maker.at(url)
    // This is the default timeout.
    fakeTimers.tick(REQUEST_TIMEOUT)
    try {
      await initializePromise
      throw new Error('Maker.at should not resolve before initialize')
    } catch (e) {
      expect(e).to.equal('Maker did not call initialize in time')
    }
    fakeTimers.restore()
  })

  it('should correctly indicate support for protocol versions', async () => {
    // Protocol is supported if the major version is the same,
    // and minor and patch versions are the same or greater than requried
    mockMaker.initOptions = { lastLook: '1.2.3' }
    const server = await Maker.at(url)
    expect(server.supportsProtocol('last-look')).to.be.true
    expect(server.supportsProtocol('request-for-quote')).to.be.false
    expect(server.supportsProtocol('last-look', '0.9.1')).to.be.false
    expect(server.supportsProtocol('last-look', '1.0.0')).to.be.true
    expect(server.supportsProtocol('last-look', '1.1.1')).to.be.true
    expect(server.supportsProtocol('last-look', '1.2.3')).to.be.true
    expect(server.supportsProtocol('last-look', '1.2.4')).to.be.false
    expect(server.supportsProtocol('last-look', '1.3.0')).to.be.false
    expect(server.supportsProtocol('last-look', '2.2.3')).to.be.false
  })

  it('should reject when calling a method from an unsupported protocol', async () => {
    const server = await Maker.at(url)
    try {
      await server.getSignerSideOrder(
        '0',
        ADDRESS_ZERO,
        ADDRESS_ZERO,
        ADDRESS_ZERO
      )
      throw new Error('expected getSignerSideOrder method to reject')
    } catch (e) {
      expect(e.message).to.match(/support/)
    }
  })

  it('should not initialize if initialize is called with bad params', async () => {
    mockMaker.initOptions = null
    const responseReceived = new Promise<void>((resolve) => {
      const onInitializeResponse = () => {
        resolve()
      }
      mockMaker.setNextMessageCallback(onInitializeResponse)
    })
    mockMaker.on('connection', (socket) => {
      socket.send(
        JSON.stringify(createRequest('initialize', [{ bad: 'params' }], 'abc'))
      )
    })
    Maker.at(url).catch(() => {
      /* this is expected, server won't init */
    })

    await responseReceived
  })

  it('should respond with an error if pricing is called with bad params', async () => {
    await Maker.at(url)
    const initResponseReceived = new Promise<void>((resolve) => {
      mockMaker.setNextMessageCallback(() => resolve())
    })
    await initResponseReceived
    const responseReceived = new Promise<void>((resolve) => {
      const onPricingReponse = (socket, data) => {
        expect(data).to.be.a.JSONRpcError('abc', {
          code: JsonRpcErrorCodes.INVALID_PARAMS,
          message:
            'Received invalid param format or values for method "updatePricing": {"bad":"pricing"}',
        })
        resolve()
      }
      mockMaker.setNextMessageCallback(onPricingReponse)
    })

    mockMaker.emit(
      'message',
      JSON.stringify(
        createRequest('updatePricing', [{ bad: 'pricing' }], 'abc')
      )
    )

    await responseReceived
  })

  it('should return the correct sender wallet', async () => {
    mockMaker.initOptions = {
      lastLook: '1.2.3',
      params: {
        senderWallet: '0xmySender',
      },
    }
    const server = await Maker.at(url)
    expect(server.getSenderWallet()).to.equal('0xmySender')
  })

  afterEach(() => {
    mockMaker.close()
  })
  after(() => {
    MockSocketServer.stopMockingWebSocket()
  })
})
