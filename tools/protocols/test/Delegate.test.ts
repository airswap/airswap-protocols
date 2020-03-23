import { fancy } from 'fancy-test'
import { expect } from 'chai'
import { ethers } from 'ethers'
import { bigNumberify } from 'ethers/utils'
import { ADDRESS_ZERO } from '@airswap/constants'
import { functions } from '@airswap/test-utils'
import { createOrder, signOrder } from '@airswap/utils'

import { Delegate } from '..'

class MockTransaction {
  public hash: string

  public constructor() {
    this.hash = 'trxHash'
  }

  public wait(confirmations) {
    return
  }
}

class MockContract {
  public tradeWallet() {
    return 'tradeWallet'
  }

  public getMaxQuote(senderToken, signerToken) {
    return {
      senderAmount: 333,
      signerAmount: 999,
    }
  }

  public getSignerSideQuote(senderAmount, senderToken, signerToken) {
    return 999
  }

  public getSenderSideQuote(signerAmount, signerToken, senderToken) {
    return 333
  }

  public provideOrder(order) {
    return new MockTransaction()
  }

  public balanceOf() {
    return bigNumberify(1000)
  }
}

describe('Delegate', () => {
  fancy
    .stub(ethers, 'Contract', () => new MockContract())
    .it('Delegate getWallet()', async () => {
      const wallet = await new Delegate(ADDRESS_ZERO).getWallet()
      expect(wallet).to.equal('tradeWallet')
    })

  fancy
    .stub(ethers, 'Contract', () => new MockContract())
    .it('Delegate getMaxQuote()', async () => {
      const quote = await new Delegate(ADDRESS_ZERO).getMaxQuote('', '')
      expect(quote.protocol).to.equal('0x0001')
      expect(quote.locator).to.equal(ADDRESS_ZERO)
      expect(quote.sender.amount).to.equal('333')
      expect(quote.signer.amount).to.equal('999')
    })

  fancy
    .stub(ethers, 'Contract', () => new MockContract())
    .it('Delegate getSignerSideQuote()', async () => {
      const quote = await new Delegate(ADDRESS_ZERO).getSignerSideQuote(
        '333',
        '',
        ''
      )
      expect(quote.protocol).to.equal('0x0001')
      expect(quote.locator).to.equal(ADDRESS_ZERO)
      expect(quote.sender.amount).to.equal('333')
      expect(quote.signer.amount).to.equal('999')
    })

  fancy
    .stub(ethers, 'Contract', () => new MockContract())
    .it('Delegate getSenderSideQuote()', async () => {
      const quote = await new Delegate(ADDRESS_ZERO).getSenderSideQuote(
        '999',
        '',
        ''
      )
      expect(quote.protocol).to.equal('0x0001')
      expect(quote.locator).to.equal(ADDRESS_ZERO)
      expect(quote.sender.amount).to.equal('333')
      expect(quote.signer.amount).to.equal('999')
    })

  fancy
    .stub(ethers, 'Contract', () => new MockContract())
    .it('Delegate provideOrder()', async () => {
      const signer = functions.getTestWallet()
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: '',
            token: '',
            amount: 0,
          },
          sender: {
            wallet: '',
            token: '',
            amount: 0,
          },
        }),
        signer,
        ''
      )
      const trx = await new Delegate(ADDRESS_ZERO).provideOrder(order, signer)
      expect(trx).to.equal('trxHash')
    })
})
