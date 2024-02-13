import { createClient } from 'redis'
import {
  FullOrder,
  OrderFilter,
  Indexes,
  Direction,
  THIRTY_DAYS,
} from '@airswap/utils'
import reset from '../redis/redis.config'

function tagsKey(token: string) {
  return `tags:${token.toLowerCase()}`
}

function tokenKey(token: string, id: string) {
  return `ordersByToken:${token.toLowerCase()}:${id}`
}

function signerKey(signer: string, nonce: string) {
  return `ordersBySigner:${signer.toLowerCase()}:${nonce}`
}

function cleanTags(tags: string[]) {
  return tags.map((tag) =>
    tag.replace(/\:/g, '\\:').replace(/\=/g, '\\=').replace(/\|/g, '\\|')
  )
}

export class Redis {
  private client: any
  private ttl: number
  private defaultReadLimit: number

  public constructor(
    connectionUrl: any,
    defaultReadLimit = 10,
    ttl = THIRTY_DAYS
  ) {
    this.client = createClient({
      url: connectionUrl,
    })
    this.defaultReadLimit = defaultReadLimit
    this.ttl = ttl
  }

  public async write(order: FullOrder, tags: string[] = []) {
    if (!this.client.isOpen) {
      await this.client.connect()
    }

    const existing = await this.client.json.get(
      tokenKey(order.signer.token, order.signer.id)
    )

    // Delete existing order if found.
    if (existing) {
      const existingOrder = await this.client.json.get(
        signerKey(existing.signerWallet, existing.nonce)
      )
      await this.client.json.del(
        signerKey(existing.signerWallet, existing.nonce)
      )
      await this.client.json.del(
        tokenKey(existingOrder.signer.token, existingOrder.signer.id)
      )
    }

    // Set order by signer wallet and nonce.
    await this.client.json.set(
      signerKey(order.signer.wallet, order.nonce),
      '$',
      { ...order, tags: tags || [] }
    )
    await this.client.expire(
      signerKey(order.signer.wallet, order.nonce),
      this.ttl
    )

    // Set unique by signer token and signer id.
    await this.client.json.set(
      tokenKey(order.signer.token, order.signer.id),
      '$',
      { nonce: order.nonce, signerWallet: order.signer.wallet.toLowerCase() }
    )
    await this.client.expire(
      tokenKey(order.signer.token, order.signer.id),
      this.ttl
    )

    // Add tags to set for the signer token.
    if (tags.length) {
      await this.client.sAdd(tagsKey(order.signer.token), tags)
    }
    return true
  }

  public async tags(token: string) {
    if (!this.client.isOpen) {
      await this.client.connect()
    }
    return (await this.client.sMembers(tagsKey(token))) || []
  }

  public async read(
    filter: OrderFilter,
    offset = 0,
    limit = this.defaultReadLimit,
    by = Indexes.EXPIRY,
    direction = Direction.ASC
  ) {
    if (!this.client.isOpen) {
      await this.client.connect()
    }

    const args = []
    if (filter.senderToken) args.push(`@senderToken:${filter.senderToken}`)
    if (filter.signerToken) args.push(`@signerToken:${filter.signerToken}`)
    if (filter.signerId) args.push(`@signerId:${filter.signerId}`)
    if (filter.signerWallet) args.push(`@signerWallet:${filter.signerWallet}`)
    if (filter.tags?.length)
      args.push(`@tags:{${cleanTags(filter.tags).join('|')}}`)

    const { total, documents } = await this.client.ft.search(
      'index:ordersBySigner',
      args.join(' '),
      {
        LIMIT: { from: offset, size: limit },
        SORTBY: { BY: by, DIRECTION: direction },
      }
    )
    return {
      orders: documents.map((res: any) => res.value),
      offset,
      total,
    }
  }

  public async delete(signerWallet: string, nonce: string) {
    if (!this.client.isOpen) {
      await this.client.connect()
    }

    const order = await this.client.json.get(signerKey(signerWallet, nonce))
    if (order) {
      await this.client.json.del(signerKey(order.signer.wallet, order.nonce))
      await this.client.json.del(tokenKey(order.signer.token, order.signer.id))
      return true
    }
    return false
  }

  public async reset() {
    if (!this.client.isOpen) {
      await this.client.connect()
    }
    await reset(this.client)
  }

  public async disconnect() {
    if (this.client.isOpen) {
      await this.client.disconnect()
    }
  }
}
