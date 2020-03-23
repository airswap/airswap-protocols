import { fancy } from 'fancy-test'
import { expect } from 'chai'
import { ethers } from 'ethers'
import { bigNumberify } from 'ethers/utils'
import { ADDRESS_ZERO } from '@airswap/constants'
import { functions } from '@airswap/test-utils'
import { createOrder, signOrder } from '@airswap/utils'

import { Swap } from '..'

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
  public swap(order) {
    return new MockTransaction()
  }
}

describe('Swap', () => {
  fancy
    .stub(ethers, 'Contract', () => new MockContract())
    .it('Swap getAddress()', async () => {
      const address = await Swap.getAddress()
      expect(address).to.equal('0x2e7373D70732E0F37F4166D8FD9dBC89DD5BC476')
    })
  fancy
    .stub(ethers, 'Contract', () => new MockContract())
    .it('Swap swap()', async () => {
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
      const trx = await new Swap().swap(order, signer)
      expect(trx).to.equal('trxHash')
    })
})
