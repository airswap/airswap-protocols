import { fancy } from 'fancy-test'
import { expect } from 'chai'
import { ethers } from 'ethers'
import { functions } from '@airswap/test-utils'
import { createOrder, signOrder } from '@airswap/utils'

import { Swap } from '..'
import { ADDRESS_ZERO } from '@airswap/constants'

class MockTransaction {
  public hash: string

  public constructor() {
    this.hash = 'trxHash'
  }

  public wait() {
    return
  }
}

class MockContract {
  public swap() {
    return new MockTransaction()
  }
}

let signer
let order

describe('Swap', () => {
  before(async () => {
    signer = functions.getTestWallet()
    order = await signOrder(
      createOrder({
        signer: {
          amount: 0,
        },
        sender: {
          amount: 0,
        },
      }),
      signer,
      ADDRESS_ZERO
    )
  })
  fancy
    .stub(ethers, 'Contract', () => new MockContract())
    .it('Swap getAddress()', async () => {
      const address = await Swap.getAddress()
      expect(address).to.equal('0x2e7373D70732E0F37F4166D8FD9dBC89DD5BC476')
    })
  fancy
    .stub(ethers, 'Contract', () => new MockContract())
    .do(async () => {
      await Swap.getAddress('9')
    })
    .catch(/Swap deploy not found for chainId/)
    .it('Swap getAddress() throw')
  fancy
    .stub(ethers, 'Contract', () => new MockContract())
    .it('Swap swap()', async () => {
      const trx = await new Swap().swap(order, signer)
      expect(trx).to.equal('trxHash')
    })
  fancy
    .stub(ethers, 'Contract', () => new MockContract())
    .do(async () => {
      await new Swap().swap(order)
    })
    .catch(/Wallet must be provided/)
    .it('Swap swap() throw')
})
