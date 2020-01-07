var expect = require('chai').expect

const { orders } = require('@airswap/order-utils')

describe('Orders', async () => {
  const senderWallet = '0xbabe31056c0fe1b704d811b2405f6e9f5ae5e59d'
  const signerWallet = '0x9d2fb0bcc90c6f3fa3a98d2c760623a4f6ee59b4'

  // rinkeby addresses
  const ASTAddress = '0xcc1cbd4f67cceb7c001bd4adf98451237a193ff8'
  const WETHAddress = '0xc778417e063141139fce010982780140aa0cd5ab'

  const rinkebySwap = '0x43f18D371f388ABE40b9dDaac44D1C9c9185a078'

  const MAY_11_2017_00_00_00 = '1494460800'

  orders.setVerifyingContract(rinkebySwap)

  it('Checks that a generated order is valid', async () => {
    const order = await orders.getOrder({
      expiry: MAY_11_2017_00_00_00,
      nonce: '101',
      signer: {
        wallet: signerWallet,
        token: ASTAddress,
        amount: '0',
      },
      sender: {
        wallet: senderWallet,
        token: WETHAddress,
        amount: '0',
      },
    })
    expect(orders.isValidOrder(order)).to.equal(true)
  })
})
