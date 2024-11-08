import { ChainIds } from '@airswap/utils'
import { expect } from 'chai'
import { Redis, createIndex } from '../redis/redis'

import {
  ADDRESS_ZERO,
  type FullOrder,
  createOrder,
  createOrderSignature,
} from '@airswap/utils'

const store = new Redis(process.env.REDISCLOUD_URL)

const TOKEN_ADDRESS = '0x000000000000000000000000000000000000000A'
const signerOne = '0x0000000000000000000000000000000000000001'
const signerTwo = '0x0000000000000000000000000000000000000002'

let orderOne: FullOrder
let orderTwo: FullOrder

async function createSignedOrder(
  id: string,
  signerWallet = ADDRESS_ZERO,
  signerToken = TOKEN_ADDRESS,
  chainId = 1
): Promise<FullOrder> {
  const unsignedOrder = createOrder({
    signer: {
      wallet: signerWallet,
      token: signerToken,
      id,
    },
  })
  return {
    chainId,
    swapContract: ADDRESS_ZERO,
    ...unsignedOrder,
    ...(await createOrderSignature(
      unsignedOrder,
      '0x4934d4ff925f39f91e3729fbce52ef12f25fdf93e014e291350f7d314c1a096b',
      ADDRESS_ZERO
    )),
  }
}

describe('Redis', async () => {
  beforeEach(async () => {
    await store.flush()
    await createIndex(store.client)
    orderOne = await createSignedOrder('1', signerOne)
    orderTwo = await createSignedOrder('2', signerTwo)
  })

  after(async () => {
    await store.disconnect()
  })

  it('Tags are stored', async () => {
    await store.write(orderOne, ['grass:green', 'sky:blue'])
    await store.write(orderTwo, ['grass:green', 'grass:green', 'sky:grey'])
    const tokenTags = await store.tags(TOKEN_ADDRESS)
    expect(tokenTags).to.deep.equal(['grass:green', 'sky:blue', 'sky:grey'])
  })

  it('Query by chain id', async () => {
    await store.write(orderOne)
    await store.write(
      await createSignedOrder('2', signerTwo, TOKEN_ADDRESS, ChainIds.SEPOLIA)
    )
    const res = await store.read({
      chainId: ChainIds.SEPOLIA,
    })
    expect(res.total).to.equal(1)
  })

  it('Query by signer token', async () => {
    await store.write(orderOne)
    await store.write(orderTwo)
    const res = await store.read({
      signerToken: TOKEN_ADDRESS,
    })
    expect(res.total).to.equal(2)
    expect(res.orders[0].signer.id).to.equal('1')
  })

  it('Query by signer wallet', async () => {
    await store.write(orderOne)
    await store.write(orderTwo)
    const res = await store.read({
      signerWallet: orderOne.signer.wallet,
    })
    expect(res.total).to.equal(1)
    expect(res.orders[0].signer.id).to.equal('1')
  })

  it('Query by tag', async () => {
    await store.write(orderOne, ['Grass|Green', 'Sun:Bright Yellow'])
    await store.write(orderTwo, [
      'Grass|Green',
      'Sun=Deep Orange',
      'Grass',
      'Two Words',
      'Eyes:Big Yellow Side-eye',
      ' ',
      '',
    ])
    const res = await store.read({
      signerToken: TOKEN_ADDRESS,
      tags: [
        'Sun:Bright Yellow',
        'Eyes:Big Yellow Side-eye',
        'Sun=Deep Orange',
      ],
    })
    expect(res.total).to.equal(2)
    expect(res.orders[0].signer.id).to.equal('1')
    expect(res.orders[1].signer.id).to.equal('2')
  })

  it('Query with empty tags', async () => {
    await store.write(orderOne)
    await store.write(orderTwo)
    const res = await store.read({
      signerToken: TOKEN_ADDRESS,
      tags: [],
    })
    expect(res.total).to.equal(2)
    expect(res.orders[0].signer.id).to.equal('1')
  })

  it('Query with pagination', async () => {
    const OFFSET = 5
    const LIMIT = 30
    const TOTAL = 125
    for (let i = 0; i < TOTAL; i++) {
      const order = await createSignedOrder(String(i), signerOne)
      await store.write(order)
    }
    const res = await store.read(
      {
        signerToken: TOKEN_ADDRESS,
      },
      OFFSET,
      LIMIT
    )
    expect(res.total).to.equal(TOTAL)
    expect(res.offset).to.equal(OFFSET)
    expect(res.orders.length).to.equal(LIMIT)
    expect(res.orders[0].signer.id).to.equal(String(OFFSET))
  })
})
