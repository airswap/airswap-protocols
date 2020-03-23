import { fancy } from 'fancy-test'
import { expect } from 'chai'
import { ethers } from 'ethers'
import { bigNumberify } from 'ethers/utils'
import { ADDRESS_ZERO } from '@airswap/constants'
import { functions } from '@airswap/test-utils'
import { createOrder, signOrder } from '@airswap/utils'

import { Validator } from '..'

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
  public checkSwap(order) {
    return [
      bigNumberify(1),
      ['0x746573744572726f720000000000000000000000000000000000000000000000'],
    ] //ethers.utils.formatBytes32String('testError')
  }

  public checkWrappedSwap(order, delegateAddress, wrapperAddress) {
    return [
      bigNumberify(1),
      ['0x746573744572726f720000000000000000000000000000000000000000000000'],
    ] //ethers.utils.formatBytes32String('testError')
  }

  public checkDelegate(order, delegateAddress) {
    return [
      bigNumberify(1),
      ['0x746573744572726f720000000000000000000000000000000000000000000000'],
    ] //ethers.utils.formatBytes32String('testError')
  }

  public checkWrappedDelegate(order, delegateAddress, wrapperAddress) {
    return [
      bigNumberify(1),
      ['0x746573744572726f720000000000000000000000000000000000000000000000'],
    ] //ethers.utils.formatBytes32String('testError')
  }
}

let signer
let order

describe('Validator', () => {
  before(async () => {
    signer = functions.getTestWallet()
    order = await signOrder(
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
  })
  fancy
    .stub(ethers, 'Contract', () => new MockContract())
    .it('Validator getAddress()', async () => {
      const address = await Validator.getAddress()
      expect(address).to.equal('0x2D8849EAaB159d20Abf10D4a80c97281A12448CC')
    })
  fancy
    .stub(ethers, 'Contract', () => new MockContract())
    .do(async () => {
      await Validator.getAddress('9')
    })
    .catch(/Validator deploy not found for chainId/)
    .it('Validator getAddress() throw')
  fancy
    .stub(ethers, 'Contract', () => new MockContract())
    .it('Validator getReason()', async () => {
      const reason = await Validator.getReason('test reason')
      expect(reason).to.equal('test reason')
    })
  fancy
    .stub(ethers, 'Contract', () => new MockContract())
    .it('Validator checkSwap()', async () => {
      const errors = await new Validator().checkSwap(order)
      expect(errors[0]).to.equal('testError')
    })
  fancy
    .stub(ethers, 'Contract', () => new MockContract())
    .it('Validator checkWrappedSwap()', async () => {
      const errors = await new Validator().checkWrappedSwap(order, '', '')
      expect(errors[0]).to.equal('testError')
    })
  fancy
    .stub(ethers, 'Contract', () => new MockContract())
    .it('Validator checkDelegate()', async () => {
      const errors = await new Validator().checkDelegate(order, '')
      expect(errors[0]).to.equal('testError')
    })
  fancy
    .stub(ethers, 'Contract', () => new MockContract())
    .it('Validator checkWrappedDelegate()', async () => {
      const errors = await new Validator().checkWrappedDelegate(order, '', '')
      expect(errors[0]).to.equal('testError')
    })
})
