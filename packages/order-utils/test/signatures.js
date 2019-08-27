var expect = require('chai').expect

const { orders, signatures } = require('@airswap/order-utils')

describe('Signatures', async () => {
  const swapAddress = '0x78db49d0459a67158bdca6e161be3d90342c7247'

  const takerWallet = '0xbabe31056c0fe1b704d811b2405f6e9f5ae5e59d'
  const makerWallet = '0x9d2fb0bcc90c6f3fa3a98d2c760623a4f6ee59b4'
  const makerPrivKey = Buffer.from(
    '4934d4ff925f39f91e3729fbce52ef12f25fdf93e014e291350f7d314c1a096b',
    'hex'
  )

  const ASTAddress = '0xcc1cbd4f67cceb7c001bd4adf98451237a193ff8'
  const WETHAddress = '0xc778417e063141139fce010982780140aa0cd5ab'

  it('Checks that a Version 0x45: personalSign signature is valid', async () => {
    const { order } = await orders.getOrder({
      expiry: 1494460800,
      nonce: 101,
      maker: {
        wallet: makerWallet,
        token: ASTAddress,
        param: 0,
      },
      taker: {
        wallet: takerWallet,
        token: WETHAddress,
        param: 0,
      },
    })

    const signature = signatures.getPersonalSignature(
      order,
      makerPrivKey,
      swapAddress
    )

    expect(signature).to.deep.include({
      version: '0x45',
      signer: makerWallet,
      r: Buffer.from(
        'b8bb81c7a0e5e88d74af3a3883d7d6e4a9b2a1f6fdf166a446a5bdc3dc495c89',
        'hex'
      ),
      s: Buffer.from(
        '54110f864a69ce8e65e49efa1f93e5f5433e99a68a394e24a5b95760d0a19c63',
        'hex'
      ),
      v: 28,
    })
  })

  it('Checks that a Version 0x01: signTypedData signature is valid', async () => {
    const { order } = await orders.getOrder({
      expiry: 1494460800,
      nonce: 101,
      maker: {
        wallet: makerWallet,
        token: ASTAddress,
        param: 0,
      },
      taker: {
        wallet: takerWallet,
        token: WETHAddress,
        param: 0,
      },
    })

    const signature = signatures.getTypedDataSignature(
      order,
      makerPrivKey,
      swapAddress
    )

    expect(signature).to.deep.include({
      version: '0x01',
      signer: makerWallet,
      r: Buffer.from(
        '9c74ae08b167c61f0ad5ef1dd7937c196548ef98e718401d9515e441f3bd36bb',
        'hex'
      ),
      s: Buffer.from(
        '18a8b95277a6b7c9d5d54bc5825a70be1bd28d1a09edecb7c8ab7012fb4ad67a',
        'hex'
      ),
      v: 28,
    })
  })
})
