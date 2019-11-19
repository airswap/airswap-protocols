var expect = require('chai').expect
const assert = require('assert')

const { orders, signatures } = require('@airswap/order-utils')
const {
  GANACHE_PROVIDER,
  KNOWN_GANACHE_WALLET,
} = require('@airswap/order-utils').constants

describe('Orders', async () => {
  const senderWallet = '0xbabe31056c0fe1b704d811b2405f6e9f5ae5e59d'
  const signerWallet = '0x9d2fb0bcc90c6f3fa3a98d2c760623a4f6ee59b4'

  // rinkeby addresses
  const ASTAddress = '0xcc1cbd4f67cceb7c001bd4adf98451237a193ff8'
  const WETHAddress = '0xc778417e063141139fce010982780140aa0cd5ab'

  const rinkebySwap = '0x43f18D371f388ABE40b9dDaac44D1C9c9185a078'

  orders.setVerifyingContract(rinkebySwap)

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

  it('Check correct order without signature', async () => {
    const order = await orders.getOrder({
      expiry: '1604787494',
      nonce: '0',
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
    const errors = await orders.checkOrder(order, 'rinkeby')
    assert.equal(errors.length, 0)
  })

  it('Check correct order with signature', async () => {
    const order = await orders.getOrder({
      expiry: '1604787494',
      nonce: '0',
      signer: {
        wallet: KNOWN_GANACHE_WALLET,
        token: ASTAddress,
        param: '0',
      },
      sender: {
        wallet: senderWallet,
        token: WETHAddress,
        param: '0',
      },
    })

    order.signature = await signatures.getWeb3Signature(
      order,
      KNOWN_GANACHE_WALLET,
      rinkebySwap,
      GANACHE_PROVIDER
    )

    const errors = await orders.checkOrder(order, 'rinkeby')
    assert.equal(errors.length, 0)
  })

  it('Check expired order', async () => {
    const order = await orders.getOrder({
      expiry: '1494460800',
      nonce: '101',
      signer: {
        wallet: KNOWN_GANACHE_WALLET,
        token: ASTAddress,
        param: '400',
      },
      sender: {
        wallet: senderWallet,
        token: WETHAddress,
        param: '2',
      },
    })

    order.signature = await signatures.getWeb3Signature(
      order,
      KNOWN_GANACHE_WALLET,
      rinkebySwap,
      GANACHE_PROVIDER
    )

    const errors = await orders.checkOrder(order, 'rinkeby')
    assert.equal(errors.length, 2)
    assert.equal(errors[1], 'Order expiry has passed')
  })

  it('Check invalid signature', async () => {
    const order = await orders.getOrder({
      expiry: '1604787494',
      nonce: '101',
      signer: {
        wallet: KNOWN_GANACHE_WALLET,
        token: ASTAddress,
        param: '400',
      },
      sender: {
        wallet: senderWallet,
        token: WETHAddress,
        param: '2',
      },
    })

    order.signature = await signatures.getWeb3Signature(
      order,
      KNOWN_GANACHE_WALLET,
      rinkebySwap,
      GANACHE_PROVIDER
    )

    order.signature.v += 1
    const errors = await orders.checkOrder(order, 'rinkeby')
    assert.equal(errors.length, 2)
    assert.equal(errors[1], 'Signature invalid')
  })

  it('Check order without allowance', async () => {
    const order = await orders.getOrder({
      expiry: '1604787494',
      nonce: '101',
      signer: {
        wallet: KNOWN_GANACHE_WALLET,
        token: ASTAddress,
        param: '400',
      },
      sender: {
        wallet: senderWallet,
        token: WETHAddress,
        param: '2',
      },
    })

    order.signature = await signatures.getWeb3Signature(
      order,
      KNOWN_GANACHE_WALLET,
      rinkebySwap,
      GANACHE_PROVIDER
    )

    const errors = await orders.checkOrder(order, 'rinkeby')
    assert.equal(errors.length, 1)
    assert.equal(errors[0], 'signer allowance is too low')
  })

  it('Check order without balance', async () => {
    const order = await orders.getOrder({
      expiry: '1604787494',
      nonce: '101',
      signer: {
        wallet: KNOWN_GANACHE_WALLET,
        token: ASTAddress,
        param: '100001000',
      },
      sender: {
        wallet: senderWallet,
        token: WETHAddress,
        param: '2',
      },
    })

    order.signature = await signatures.getWeb3Signature(
      order,
      KNOWN_GANACHE_WALLET,
      rinkebySwap,
      GANACHE_PROVIDER
    )

    const errors = await orders.checkOrder(order, 'rinkeby')
    assert.equal(errors.length, 2)
    assert.equal(errors[0], 'signer balance is too low')
  })
})
