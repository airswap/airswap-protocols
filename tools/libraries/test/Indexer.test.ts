import { expect } from 'chai'
import {
  NodeIndexer,
  SortField,
  SortOrder,
  toSortField,
  toSortOrder,
} from '../src/Indexer'
import { ethers } from 'ethers'
import express from 'express'
import bodyParser from 'body-parser'
import { Server } from 'http'
import {
  createOrderERC20,
  createOrderERC20Signature,
  isValidFullOrderERC20,
} from '@airswap/utils'
import { ADDRESS_ZERO, chainIds } from '@airswap/constants'

const signerPrivateKey =
  '0x4934d4ff925f39f91e3729fbce52ef12f25fdf93e014e291350f7d314c1a096b'
const provider = ethers.getDefaultProvider('goerli')
const wallet = new ethers.Wallet(signerPrivateKey, provider)

describe('toSortField', () => {
  it('should match value', () => {
    expect(toSortField('SENDER_AMOUNT')).to.equal(SortField.SENDER_AMOUNT)
    expect(toSortField('sender_amount')).to.equal(SortField.SENDER_AMOUNT)
    expect(toSortField('SIGNER_AMOUNT')).to.equal(SortField.SIGNER_AMOUNT)
    expect(toSortField('signer_amount')).to.equal(SortField.SIGNER_AMOUNT)
  })

  it('should return undefined', () => {
    expect(toSortField('')).to.equal(undefined)
    expect(toSortField('aze')).to.equal(undefined)
  })
})

describe('toSortOrder', () => {
  it('should match value', () => {
    expect(toSortOrder('ASC')).to.equal(SortOrder.ASC)
    expect(toSortOrder('asc')).to.equal(SortOrder.ASC)
    expect(toSortOrder('DESC')).to.equal(SortOrder.DESC)
    expect(toSortOrder('desc')).to.equal(SortOrder.DESC)
  })

  it('should return undefined', () => {
    expect(toSortOrder('')).to.equal(undefined)
    expect(toSortOrder('aze')).to.equal(undefined)
  })
})

describe('client', () => {
  let app: express
  let server: Server

  before(() => {
    app = express()
    app.use(bodyParser.json())
    server = app.listen(12435)
  })

  after(() => {
    server.close()
  })

  describe('query on server Node', () => {
    it('Should query on post /getOrdersERC20', async () => {
      app.post('/', async (req, res) => {
        expect(req.body.jsonrpc).to.equal('2.0')
        expect(req.body.method).to.equal('getOrdersERC20')
        expect(req.body.params).to.eql([{}])

        const unsignedOrder = createOrderERC20({})
        const signature = await createOrderERC20Signature(
          unsignedOrder,
          wallet.privateKey,
          ADDRESS_ZERO,
          1
        )
        res.send({
          result: {
            orders: [
              {
                order: {
                  ...unsignedOrder,
                  ...signature,
                  chainId: chainIds.GOERLI,
                  swapContract: ADDRESS_ZERO,
                },
              },
            ],
          },
        })
      })
      const result = await new NodeIndexer(
        'http://localhost:12435'
      ).getOrdersERC20()
      expect(isValidFullOrderERC20(result.orders[0].order)).to.be.true
    })
  })
})
