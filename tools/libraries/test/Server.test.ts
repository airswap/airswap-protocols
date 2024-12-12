import chai, { expect } from 'chai'
import { ethers } from 'ethers'
import { fancy } from 'fancy-test'
import { useFakeTimers } from 'sinon'
import sinonChai from 'sinon-chai'

import {
  ADDRESS_ZERO,
  ChainIds,
  type Levels,
  type OrderERC20,
  ProtocolIds,
  createOrder,
  createOrderERC20,
  createOrderERC20Signature,
  createOrderSignature,
  isValidFullOrder,
  isValidFullOrderERC20,
  isValidPricingERC20,
} from '@airswap/utils'

import { JsonRpcErrorCodes } from '@airswap/jsonrpc-client-websocket'
import { Server } from '../index'
import {
  MockSocketServer,
  addJSONRPCAssertions,
  createRequest,
  createResponse,
  nextEvent,
} from './test-utils'

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

const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const USDT = '0xdac17f958d2ee523a2206206994597c13d831ec7'

const REQUEST_TIMEOUT = 4000
const URL = 'server.example.com'
const signerPrivateKey =
  '0x4934d4ff925f39f91e3729fbce52ef12f25fdf93e014e291350f7d314c1a096b'
const wallet = new ethers.Wallet(signerPrivateKey)

chai.use(sinonChai)

function mockHttpServer(api) {
  api.post('/').reply(200, async (uri, body) => {
    const params = body.params
    let order: any
    let res: any
    switch (body.method) {
      case 'getProtocols':
        res = [ProtocolIds.Discovery, ProtocolIds.RequestForQuoteERC20]
        break
      case 'getTokens':
        res = [USDC, USDT]
        break
      case 'getPricingERC20': {
        const levels: Levels = [
          ['250', '0.5'],
          ['500', '0.6'],
          ['750', '0.7'],
        ]
        res = [
          {
            baseToken: ADDRESS_ZERO,
            quoteToken: ADDRESS_ZERO,
            bid: levels,
            ask: levels,
          },
        ]
        break
      }
      case 'getSignerSideOrderERC20':
        order = createOrderERC20({
          signerToken: params.signerToken,
          senderToken: params.senderToken,
          senderAmount: params.senderAmount,
          senderWallet: params.senderWallet,
        })
        res = {
          ...order,
          ...(await createOrderERC20Signature(
            order,
            wallet.privateKey,
            params.swapContract,
            ChainIds.SEPOLIA
          )),
        }
        break
      case 'getOrdersERC20':
        order = createOrderERC20({})
        res = {
          orders: [
            {
              ...order,
              ...(await createOrderERC20Signature(
                order,
                wallet.privateKey,
                ADDRESS_ZERO,
                ChainIds.SEPOLIA
              )),
              chainId: ChainIds.SEPOLIA,
              swapContract: ADDRESS_ZERO,
            },
          ],
        }
        break
      case 'getOrders':
        order = createOrder({})
        res = {
          orders: [
            {
              ...order,
              ...(await createOrderSignature(
                order,
                wallet.privateKey,
                ADDRESS_ZERO,
                ChainIds.SEPOLIA
              )),
              chainId: ChainIds.SEPOLIA,
              swapContract: ADDRESS_ZERO,
            },
          ],
        }
        break
      case 'getTags':
        res = []
        break
      case 'considerOrderERC20':
        res = true
        break
    }
    return {
      jsonrpc: '2.0',
      id: body.id,
      result: res,
    }
  })
}

describe('HTTPServer', () => {
  it('Server getStaker()', async () => {
    const server = await Server.at(URL, { staker: wallet.address })
    expect(server.getStaker()).to.be.equal(wallet.address)
  })
  fancy
    .nock(`https://${URL}`, mockHttpServer)
    .it('Server getProtocols()', async () => {
      const server = await Server.at(URL)
      const result = await server.getProtocols()
      expect(result[0]).to.be.equal(ProtocolIds.Discovery)
      expect(result[1]).to.be.equal(ProtocolIds.RequestForQuoteERC20)
    })
  fancy
    .nock(`https://${URL}`, mockHttpServer)
    .it('Server getTokens()', async () => {
      const server = await Server.at(URL)
      const result = await server.getTokens()
      expect(result[0]).to.be.equal(USDC)
      expect(result[1]).to.be.equal(USDT)
    })
  fancy
    .nock(`https://${URL}`, mockHttpServer)
    .it('Server getPricingERC20()', async () => {
      const server = await Server.at(URL)
      const result = await server.getPricingERC20([
        { baseToken: ADDRESS_ZERO, quoteToken: ADDRESS_ZERO },
      ])
      expect(isValidPricingERC20(result)).to.be.true
    })
  fancy
    .nock(`https://${URL}`, mockHttpServer)
    .it('Server getSignerSideOrderERC20()', async () => {
      const server = await Server.at(URL, {
        swapContract: ADDRESS_ZERO,
        chainId: ChainIds.SEPOLIA,
      })
      const order = await server.getSignerSideOrderERC20(
        '0',
        ADDRESS_ZERO,
        ADDRESS_ZERO,
        ADDRESS_ZERO
      )
      expect(order.signerToken).to.equal(ADDRESS_ZERO)
    })
  fancy
    .nock(`https://${URL}`, mockHttpServer)
    .it('Server getOrdersERC20()', async () => {
      const server = await Server.at(URL)
      const result = await server.getOrdersERC20(
        {
          signerWallet: ADDRESS_ZERO,
        },
        0,
        100
      )
      expect(isValidFullOrderERC20(result.orders[0])).to.be.true
    })
  fancy
    .nock(`https://${URL}`, mockHttpServer)
    .it('Server getOrders()', async () => {
      const server = await Server.at(URL)
      const result = await server.getOrders(
        {
          signerWallet: ADDRESS_ZERO,
        },
        0,
        100
      )
      expect(isValidFullOrder(result.orders[0])).to.be.true
    })
  fancy
    .nock(`https://${URL}`, mockHttpServer)
    .it('Server getTags()', async () => {
      const server = await Server.at(URL)
      const result = await server.getTags(ADDRESS_ZERO)
      expect(result).to.have.lengthOf(0)
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

describe('WebSocketServer', () => {
  const url = 'ws://server.com:1234/'
  let mockServer: MockSocketServer
  before(() => {
    MockSocketServer.startMockingWebSocket()
  })

  beforeEach(async () => {
    mockServer = new MockSocketServer(url)
    mockServer.resetInitOptions()
  })

  it('should be initialized after Server.at has resolved', async () => {
    const server = await Server.at(url)
    const correctInitializeResponse = new Promise<void>((resolve) => {
      const onResponse = (socket, data) => {
        // Note mock server implementation uses id '123' for initialize.
        expect(data).to.be.a.JSONRpcResponse('123', true)
        resolve()
      }
      mockServer.setNextMessageCallback(onResponse)
    })
    expect(server.supportsProtocol(ProtocolIds.LastLookERC20)).to.equal(true)
    expect(server.supportsProtocol(ProtocolIds.RequestForQuoteERC20)).to.equal(
      false
    )
    await correctInitializeResponse
  })

  it('should call subscribe with the correct params and emit pricing', async () => {
    const server = await Server.at(url)

    // Ensure subscribe method is correct format.
    const onSubscribe = (socket, data) => {
      expect(data).to.be.a.JSONRpcRequest('subscribePricingERC20', {
        pairs: samplePairs,
      })
      socket.send(JSON.stringify(createResponse(data.id, samplePricing)))
    }
    mockServer.setNextMessageCallback(onSubscribe, true)
    const pricing = nextEvent(server, 'pricing-erc20')
    server.subscribePricingERC20(samplePairs)

    // Ensure pricing is emitted and has the correct values.
    expect(await pricing).to.eql(samplePricing)

    const updatedPricing = nextEvent(server, 'pricing-erc20')
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
      mockServer.setNextMessageCallback(onResponse)
    })

    // Ensure updatePricing is correctly called and causes pricing to be emitted
    mockServer.emit(
      'message',
      JSON.stringify(
        createRequest('setPricingERC20', latestPricing, updatePricingRequestId)
      )
    )
    expect(await updatedPricing).to.eql(latestPricing[0])
    await correctUpdatePricingResponse
  })

  it('should call considerOrderERC20 with the correct parameters', async () => {
    const server = await Server.at(url)
    const onConsider = (socket, data) => {
      expect(data).to.be.a.JSONRpcRequest('considerOrderERC20', fakeOrder)
      socket.send(JSON.stringify(createResponse(data.id, true)))
    }
    mockServer.setNextMessageCallback(onConsider, true)
    const result = await server.considerOrderERC20(fakeOrder)
    expect(result).to.equal(true)
  })

  fancy
    .nock(`https://${URL}`, mockHttpServer)
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

        const server = await Server.at(url)
        const result = await server.considerOrderERC20(fakeOrder)
        expect(result).to.equal(true)
      }
    )

  it('should call unsubscribe with the correct parameters', async () => {
    const server = await Server.at(url)
    const onUnsubscribe = (socket, data) => {
      expect(data).to.be.a.JSONRpcRequest('unsubscribePricingERC20', {
        pairs: samplePairs,
      })
      socket.send(JSON.stringify(createResponse(data.id, true)))
    }
    mockServer.setNextMessageCallback(onUnsubscribe, true)
    const result = await server.unsubscribePricingERC20(samplePairs)
    expect(result).to.equal(true)
  })

  it('should call subscribeAll and unsubscribeAll correctly', async () => {
    const server = await Server.at(url)
    const onSubscribeAll = (socket, data) => {
      expect(data).to.be.a.JSONRpcRequest('subscribeAllPricingERC20')
      socket.send(JSON.stringify(createResponse(data.id, true)))
    }
    const onUnsubscribeAll = (socket, data) => {
      expect(data).to.be.a.JSONRpcRequest('unsubscribeAllPricingERC20')
      socket.send(JSON.stringify(createResponse(data.id, true)))
    }
    mockServer.setNextMessageCallback(onSubscribeAll, true)
    const subscribeResult = await server.subscribeAllPricingERC20()
    expect(subscribeResult).to.equal(true)
    mockServer.setNextMessageCallback(onUnsubscribeAll, true)
    const unsubscribeResult = await server.unsubscribeAllPricingERC20()
    expect(unsubscribeResult).to.equal(true)
  })

  it("should throw if the server doesn't initialize within timeout", async () => {
    const fakeTimers = useFakeTimers()
    // prevent server from initializing
    // @ts-ignore
    mockServer.initOptions = null
    const initializePromise = Server.at(url)
    // This is the default timeout.
    fakeTimers.tick(REQUEST_TIMEOUT)
    try {
      await initializePromise
      throw new Error('Server.at should not resolve before initialize')
    } catch (e) {
      expect(e).to.equal('Server did not call setProtocols in time')
    }
    fakeTimers.restore()
  })

  it('should reject when calling a method from an unsupported protocol', async () => {
    const server = await Server.at(url)
    try {
      await server.getSignerSideOrderERC20(
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
    mockServer.initOptions = {}
    const responseReceived = new Promise<void>((resolve) => {
      const onInitializeResponse = () => {
        resolve()
      }
      mockServer.setNextMessageCallback(onInitializeResponse)
    })
    mockServer.on('connection', (socket) => {
      socket.send(
        JSON.stringify(
          createRequest('setProtocols', [{ bad: 'params' }], 'abc')
        )
      )
    })
    Server.at(url).catch(() => {
      /* this is expected, server won't init */
    })

    await responseReceived
  })

  it('should respond with an error if pricing is called with bad params', async () => {
    await Server.at(url)
    const initResponseReceived = new Promise<void>((resolve) => {
      mockServer.setNextMessageCallback(() => resolve())
    })
    await initResponseReceived
    const responseReceived = new Promise<void>((resolve) => {
      const onPricingReponse = (socket, data) => {
        expect(data).to.be.a.JSONRpcError('abc', {
          code: JsonRpcErrorCodes.INVALID_PARAMS,
          message:
            'Received invalid param format or values for method "setPricingERC20": {"bad":"pricing"}',
        })
        resolve()
      }
      mockServer.setNextMessageCallback(onPricingReponse)
    })

    mockServer.emit(
      'message',
      JSON.stringify(
        createRequest('setPricingERC20', [{ bad: 'pricing' }], 'abc')
      )
    )

    await responseReceived
  })

  it('should return the correct sender wallet', async () => {
    mockServer.initOptions = {
      lastLook: '1.2.3',
      params: {
        senderWallet: '0xmySender',
      },
    }
    const server = await Server.at(url)
    expect(server.getSenderWallet()).to.equal('0xmySender')
  })

  afterEach(() => {
    mockServer.close()
  })
  after(() => {
    MockSocketServer.stopMockingWebSocket()
  })
})
