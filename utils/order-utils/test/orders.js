var expect = require('chai').expect

const { orders, signatures } = require('@airswap/order-utils')

describe('Orders', async () => {
  const signerPrivKey = Buffer.from(
    '4934d4ff925f39f91e3729fbce52ef12f25fdf93e014e291350f7d314c1a096b',
    'hex'
  )

  const rinkebySwap = '0x43f18D371f388ABE40b9dDaac44D1C9c9185a078'

  orders.setVerifyingContract(rinkebySwap)

  it('Checks that a signed order is valid', async () => {
    const order = await orders.getOrder({
      nonce: '1',
    })
    order.signature = signatures.getPersonalSignature(
      order,
      signerPrivKey,
      rinkebySwap
    )
    expect(orders.isValidOrder(order)).to.equal(true)
  })

  it('Checks that an unsigned order is invalid', async () => {
    const order = await orders.getOrder({
      nonce: '2',
    })
    expect(orders.isValidOrder(order)).to.equal(false)
  })

  it('Checks that an incorrectly signed order is invalid', async () => {
    const order = await orders.getOrder({
      nonce: '3',
    })
    order.signature = signatures.getPersonalSignature(
      await orders.getOrder({}),
      signerPrivKey,
      rinkebySwap
    )
    expect(orders.isValidOrder(order)).to.equal(false)
  })

  it('Checks that an order missing sender wallet is invalid', async () => {
    const order = await orders.getOrder({
      nonce: '4',
    })
    delete order.sender.wallet
    expect(orders.isValidOrder(order)).to.equal(false)
  })

  it('Checks that an order missing affiliate is invalid', async () => {
    const order = await orders.getOrder({
      nonce: '5',
    })
    delete order.affiliate
    expect(orders.isValidOrder(order)).to.equal(false)
  })
})
