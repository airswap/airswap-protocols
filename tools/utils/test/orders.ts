import { expect } from 'chai'
import { ethers } from 'ethers'
import { ADDRESS_ZERO, SECONDS_IN_DAY } from '@airswap/constants'

import {
  isValidLightOrder,
} from '../index'
import {
  createLightSignature,
  getSignerFromLightSignature,
} from '../src/orders'

const signerPrivateKey =
  '0x4934d4ff925f39f91e3729fbce52ef12f25fdf93e014e291350f7d314c1a096b'
const provider = ethers.getDefaultProvider('rinkeby')
const wallet = new ethers.Wallet(signerPrivateKey, provider)

describe('Orders', async () => {

  it('Signs and validates a light order', async () => {
    const unsignedOrder = {
      nonce: Date.now().toString(),
      expiry: Math.round(Date.now() / 1000 + SECONDS_IN_DAY).toString(),
      signerWallet: ADDRESS_ZERO,
      signerToken: ADDRESS_ZERO,
      signerAmount: '0',
      signerFee: '300',
      senderWallet: ADDRESS_ZERO,
      senderToken: ADDRESS_ZERO,
      senderAmount: '0',
    }
    const { v, r, s } = await createLightSignature(
      unsignedOrder,
      wallet.privateKey,
      ADDRESS_ZERO,
      1
    )
    const signerWallet = getSignerFromLightSignature(
      unsignedOrder,
      ADDRESS_ZERO,
      1,
      v,
      r,
      s
    )
    expect(isValidLightOrder({ ...unsignedOrder, v, r, s })).to.equal(true)
    expect(signerWallet.toLowerCase()).to.equal(wallet.address.toLowerCase())
  })

})
