import { fancy } from 'fancy-test'
import { expect } from 'chai'
import { ethers } from 'ethers'
import { bigNumberify } from 'ethers/utils'
import { ADDRESS_ZERO } from '@airswap/constants'

import { Delegate } from '..'

class Contract {
  public tradeWallet() {
    return 'tradeWallet'
  }

  public getMaxQuote(senderToken, signerToken) {
    return {
      senderAmount: 333,
      signerAmount: 999,
    }
  }

  public balanceOf() {
    return bigNumberify(1000)
  }
}

describe('Delegate', () => {
  fancy
    .stub(ethers, 'Contract', () => new Contract())
    .it('Delegate getWallet()', async () => {
      const wallet = await new Delegate(ADDRESS_ZERO).getWallet()
      expect(wallet).to.equal('tradeWallet')
    })

  fancy
    .stub(ethers, 'Contract', () => new Contract())
    .it('Delegate getMaxQuote()', async () => {
      const quote = await new Delegate(ADDRESS_ZERO).getMaxQuote('', '')
      expect(quote.protocol).to.equal('0x0001')
      expect(quote.locator).to.equal(
        '0x0000000000000000000000000000000000000000'
      )
      expect(quote.sender.amount).to.equal('333')
      expect(quote.signer.amount).to.equal('999')
    })
})
