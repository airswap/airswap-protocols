import { expect } from 'chai'
import { SortField, SortOrder, toSortField, toSortOrder } from '../src/Indexer'

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
