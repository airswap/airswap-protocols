var expect = require('chai').expect

const { orders } = require('@airswap/order-utils')

describe('Orders', async () => {
  const senderWallet = '0xbabe31056c0fe1b704d811b2405f6e9f5ae5e59d'
  const signerWallet = '0x9d2fb0bcc90c6f3fa3a98d2c760623a4f6ee59b4'

  const ASTAddress = '0xcc1cbd4f67cceb7c001bd4adf98451237a193ff8'
  const WETHAddress = '0xc778417e063141139fce010982780140aa0cd5ab'

  const rinkebySwap = '0x43f18D371f388ABE40b9dDaac44D1C9c9185a078'

  it('Checks that a generated order is valid', async () => {
    const order = await orders.getOrder({
      expiry: '1494460800',
      nonce: '101',
      signer: {
        wallet: signerWallet,
        token: ASTAddress,
        param: '0',
      },
      sender: {
        wallet: senderWallet,
        token: WETHAddress,
        param: '0',
      },
    })
    expect(orders.isValidOrder(order)).to.equal(true)
  })

  it('Runs check order on an order', async () => {
    orders.setVerifyingContract(rinkebySwap)
    const order = await orders.getOrder({
      expiry: '1494460800',
      nonce: '101',
      signer: {
        wallet: signerWallet,
        token: ASTAddress,
        param: '400',
      },
      sender: {
        wallet: senderWallet,
        token: WETHAddress,
        param: '2',
      },
    })
    let errors = await orders.checkOrder(order, 'rinkeby')
    console.log(`errors: ${errors}`)
    expect(errors.length == 0).to.equal(true)
  })
})
