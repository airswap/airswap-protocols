import { expect } from 'chai'
import { ethers } from 'ethers'
import { createClient } from 'redis'
import { Redis } from '../redis/redis'
import reset from '../redis/redis.config'
import { createOrder, createOrderSignature, ADDRESS_ZERO } from '@airswap/utils'

const client = createClient({
  url: process.env.REDISCLOUD_URL,
})

const store = new Redis(process.env.REDISCLOUD_URL)
const unsignedOrder = createOrder({})
const signerPrivateKey =
  '0x4934d4ff925f39f91e3729fbce52ef12f25fdf93e014e291350f7d314c1a096b'
const wallet = new ethers.Wallet(signerPrivateKey)
let order

describe('Redis', async () => {
  before(async () => {
    await client.connect()
    await reset(client)
    order = {
      chainId: 1,
      swapContract: ADDRESS_ZERO,
      ...unsignedOrder,
      ...(await createOrderSignature(
        unsignedOrder,
        wallet.privateKey,
        ADDRESS_ZERO
      )),
    }
  })

  after(async () => {
    await client.disconnect()
  })

  it('InterfaceIds are correct', async () => {
    const tags = ['red', 'blue']
    await store.write(order, tags)
    const tokenTags = await store.tags(order.signer.token)
    const res = await store.read({ tags })
    expect(tokenTags).to.deep.equal(tags)
    expect(res).to.deep.equal({
      documents: [
        {
          ...order,
          tags,
        },
      ],
      offset: 0,
      total: 1,
    })
  })
})
