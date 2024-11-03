import {
  Direction,
  type FullOrder,
  Indexes,
  type OrderFilter,
  THIRTY_DAYS,
} from '@airswap/utils'
import { SchemaFieldTypes, createClient } from 'redis'

function tagsKey(token: string) {
  return `tags:${token.toLowerCase()}`
}

function tokenKey(chainId: number, signerToken: string, id: string) {
  return `ordersByToken:${chainId}:${signerToken.toLowerCase()}:${id}`
}

function signerKey(chainId: number, signerWallet: string, nonce: string) {
  return `ordersBySigner:${chainId}:${signerWallet.toLowerCase()}:${nonce}`
}

function cleanTags(tags: string[]) {
  return tags.map((tag) =>
    tag
      .replace(/\s/g, '\\ ')
      .replace(/\-/g, '\\-')
      .replace(/\:/g, '\\:')
      .replace(/\=/g, '\\=')
      .replace(/\|/g, '\\|')
  )
}

export class Redis {
  public client: any
  public ttl: number
  public defaultReadLimit: number

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
      tokenKey(order.chainId, order.signer.token, order.signer.id)
    )

    // Delete existing order if found.
    if (existing) {
      const existingOrder = await this.client.json.get(
        signerKey(existing[0], existing[1], existing[2])
      )
      await this.client.json.del(
        signerKey(existing[0], existing[1], existing[2])
      )
      await this.client.json.del(
        tokenKey(
          existingOrder.chainId,
          existingOrder.signer.token,
          existingOrder.signer.id
        )
      )
    }

    // Set order by signer wallet and nonce.
    await this.client.json.set(
      signerKey(order.chainId, order.signer.wallet, order.nonce),
      '$',
      { ...order, tags: tags || [] }
    )
    await this.client.expire(
      signerKey(order.chainId, order.signer.wallet, order.nonce),
      this.ttl
    )

    // Set unique by signer token and signer id.
    await this.client.json.set(
      tokenKey(order.chainId, order.signer.token, order.signer.id),
      '$',
      [order.chainId, order.signer.wallet.toLowerCase(), order.nonce]
    )
    await this.client.expire(
      tokenKey(order.chainId, order.signer.token, order.signer.id),
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
    for (const prop in filter) {
      switch (prop) {
        case 'chainId':
          args.push(`@chainId:[${filter.chainId} ${filter.chainId}]`)
          break
        case 'tags':
          if (filter.tags.length) {
            args.push(`@tags:{${cleanTags(filter.tags).join('|')}}`)
          }
          break
        default:
          args.push(`@${prop}:(${filter[prop]})`)
      }
    }

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

  public async delete(chainId: number, signerWallet: string, nonce: string) {
    if (!this.client.isOpen) {
      await this.client.connect()
    }

    const order = await this.client.json.get(
      signerKey(chainId, signerWallet, nonce)
    )
    if (order) {
      await this.client.json.del(
        signerKey(order.chainId, order.signer.wallet, order.nonce)
      )
      await this.client.json.del(
        tokenKey(order.chainId, order.signer.token, order.signer.id)
      )
      return true
    }
    return false
  }

  public async flush() {
    if (!this.client.isOpen) {
      await this.client.connect()
    }
    await this.client.flushAll()
  }

  public async disconnect() {
    if (this.client.isOpen) {
      await this.client.disconnect()
    }
  }
}

export async function createIndex(client) {
  try {
    await client.ft.dropIndex('index:ordersBySigner')
  } catch (e) {}
  await client.ft.create(
    'index:ordersBySigner',
    {
      '$.chainId': {
        type: SchemaFieldTypes.NUMERIC,
        AS: 'chainId',
      },
      '$.nonce': {
        type: SchemaFieldTypes.TEXT,
        AS: 'nonce',
      },
      '$.expiry': {
        type: SchemaFieldTypes.TEXT,
        AS: 'expiry',
      },
      '$.signer.wallet': {
        type: SchemaFieldTypes.TEXT,
        AS: 'signerWallet',
      },
      '$.signer.token': {
        type: SchemaFieldTypes.TEXT,
        AS: 'signerToken',
      },
      '$.signer.amount': {
        type: SchemaFieldTypes.TEXT,
        AS: 'signerAmount',
      },
      '$.signer.id': {
        type: SchemaFieldTypes.TEXT,
        AS: 'signerId',
      },
      '$.sender.amount': {
        type: SchemaFieldTypes.TEXT,
        AS: 'senderAmount',
      },
      '$.sender.token': {
        type: SchemaFieldTypes.TEXT,
        AS: 'senderToken',
      },
      '$.tags.*': {
        type: SchemaFieldTypes.TAG,
        AS: 'tags',
      },
    },
    {
      ON: 'JSON',
    }
  )
}
