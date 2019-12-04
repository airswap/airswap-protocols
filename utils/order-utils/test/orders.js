var expect = require('chai').expect
const assert = require('assert')

const { orders, signatures } = require('@airswap/order-utils')
const {
  GANACHE_PROVIDER,
  KNOWN_GANACHE_WALLET,
  ERC721_INTERFACE_ID,
  ERC20_INTERFACE_ID,
} = require('@airswap/order-utils').constants

describe('Orders', async () => {
  const senderWallet = '0xbabe31056c0fe1b704d811b2405f6e9f5ae5e59d'
  const signerWallet = '0x9d2fb0bcc90c6f3fa3a98d2c760623a4f6ee59b4'

  // Owns a crypto kitty
  const kittyWallet = '0x7F18BB4Dd92CF2404C54CBa1A9BE4A1153bdb078'

  // Mock ERC721Receiver wallet on rinkeby
  const erc721Wallet = '0xF727956c4CFd20b9C8D463218a65e751891da3e6'

  // rinkeby addresses
  const ASTAddress = '0xcc1cbd4f67cceb7c001bd4adf98451237a193ff8'
  const WETHAddress = '0xc778417e063141139fce010982780140aa0cd5ab'
  const cryptoKittiesAddress = '0x16baf0de678e52367adc69fd067e5edd1d33e3bf'

  const rinkebySwap = '0x43f18D371f388ABE40b9dDaac44D1C9c9185a078'

  const NOV_7_2020_22_18_14 = '1604787494'
  const MAY_11_2017_00_00_00 = '1494460800'

  orders.setVerifyingContract(rinkebySwap)

  it('Checks that a generated order is valid', async () => {
    const order = await orders.getOrder({
      expiry: MAY_11_2017_00_00_00,
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
      expiry: NOV_7_2020_22_18_14,
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
      expiry: NOV_7_2020_22_18_14,
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
      expiry: MAY_11_2017_00_00_00,
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
      expiry: NOV_7_2020_22_18_14,
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

    order.signature.v -= 1
    const errors = await orders.checkOrder(order, 'rinkeby')
    assert.equal(errors.length, 2)
    assert.equal(errors[1], 'Signature invalid')
  })

  it('Check order without allowance', async () => {
    const order = await orders.getOrder({
      expiry: NOV_7_2020_22_18_14,
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

  it('Check NFT order without balance or allowance', async () => {
    const order = await orders.getOrder({
      expiry: NOV_7_2020_22_18_14,
      nonce: '101',
      signer: {
        wallet: KNOWN_GANACHE_WALLET,
        token: ASTAddress,
        param: '0',
        kind: ERC20_INTERFACE_ID,
      },
      sender: {
        wallet: senderWallet,
        token: cryptoKittiesAddress,
        param: '460',
        kind: ERC721_INTERFACE_ID,
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
    assert.equal(errors[0], "sender doesn't own NFT")
    assert.equal(errors[1], 'sender no NFT approval')
  })

  it('Check invalid token kind', async () => {
    const order = await orders.getOrder({
      expiry: NOV_7_2020_22_18_14,
      nonce: '101',
      signer: {
        wallet: KNOWN_GANACHE_WALLET,
        token: ASTAddress,
        param: '0',
        kind: ERC20_INTERFACE_ID,
      },
      sender: {
        wallet: senderWallet,
        token: cryptoKittiesAddress,
        param: '460',
        kind: 'INVALID_KIND',
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
    assert.equal(errors[0], 'sender token kind invalid')
  })

  it('Check NFT order without allowance', async () => {
    const order = await orders.getOrder({
      expiry: NOV_7_2020_22_18_14,
      nonce: '101',
      signer: {
        wallet: KNOWN_GANACHE_WALLET,
        token: ASTAddress,
        param: '0',
        kind: ERC20_INTERFACE_ID,
      },
      sender: {
        wallet: kittyWallet,
        token: cryptoKittiesAddress,
        param: '460',
        kind: ERC721_INTERFACE_ID,
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
    assert.equal(errors[0], 'sender no NFT approval')
  })

  it('Check NFT order to an invalid contract', async () => {
    const order = await orders.getOrder({
      expiry: NOV_7_2020_22_18_14,
      nonce: '101',
      signer: {
        wallet: ASTAddress,
        token: ASTAddress,
        param: '0',
        kind: ERC20_INTERFACE_ID,
      },
      sender: {
        wallet: kittyWallet,
        token: cryptoKittiesAddress,
        param: '460',
        kind: ERC721_INTERFACE_ID,
      },
    })

    const errors = await orders.checkOrder(order, 'rinkeby')

    assert.equal(errors.length, 2)
    assert.equal(errors[0], 'sender no NFT approval')
    assert.equal(errors[1], 'signer is not configured to receive NFTs')
  })

  it('Check NFT order to a valid contract', async () => {
    const order = await orders.getOrder({
      expiry: NOV_7_2020_22_18_14,
      nonce: '101',
      signer: {
        wallet: erc721Wallet,
        token: ASTAddress,
        param: '0',
        kind: ERC20_INTERFACE_ID,
      },
      sender: {
        wallet: kittyWallet,
        token: cryptoKittiesAddress,
        param: '460',
        kind: ERC721_INTERFACE_ID,
      },
    })

    const errors = await orders.checkOrder(order, 'rinkeby')

    // length 1 showing the contract was accepted
    assert.equal(errors.length, 1)
    assert.equal(errors[0], 'sender no NFT approval')
  })

  it('Check order without balance', async () => {
    const order = await orders.getOrder({
      expiry: NOV_7_2020_22_18_14,
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
