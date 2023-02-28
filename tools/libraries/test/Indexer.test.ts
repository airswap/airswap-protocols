import { expect } from 'chai'
import {
  NodeIndexer,
  SortField,
  SortOrder,
  toSortField,
  toSortOrder,
} from '../src/Indexer'
import express from 'express'
import bodyParser from 'body-parser'
import { Server } from 'http'

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
    it('Should query on /', async () => {
      app.get('/', (req, res) => {
        res.send({ result: { a: 'b' } })
      })
      const health = await new NodeIndexer(
        'http://localhost:12435'
      ).getHealthCheck()
      expect(health).to.eql({ a: 'b' })
    })

    it('Should query on post /getOrdersERC20', async () => {
      app.post('/', (req, res) => {
        expect(req.body.jsonrpc).to.equal('2.0')
        expect(req.body.id).to.equal('1')
        expect(req.body.method).to.equal('getOrdersERC20')
        expect(req.body.params).to.eql([{}])
        res.send({ result: { a: 'b' } })
      })
      const health = await new NodeIndexer(
        'http://localhost:12435'
      ).getOrdersERC20()
      expect(health).to.eql({ a: 'b' })
    })
  })
})
