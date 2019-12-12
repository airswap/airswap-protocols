var expect = require('chai').expect

const { orders, signatures } = require('@airswap/order-utils')

describe('Signatures', async () => {
  const swapAddress = '0x78db49d0459a67158bdca6e161be3d90342c7247'

  const senderWallet = '0xbabe31056c0fe1b704d811b2405f6e9f5ae5e59d'
  const signerWallet = '0x9d2fb0bcc90c6f3fa3a98d2c760623a4f6ee59b4'
  const signerPrivKey = Buffer.from(
    '4934d4ff925f39f91e3729fbce52ef12f25fdf93e014e291350f7d314c1a096b',
    'hex'
  )

  const ASTAddress = '0xcc1cbd4f67cceb7c001bd4adf98451237a193ff8'
  const WETHAddress = '0xc778417e063141139fce010982780140aa0cd5ab'

  it('Checks that a Version 0x45: personalSign signature is valid', async () => {
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

    const signature = signatures.getPersonalSignature(
      order,
      signerPrivKey,
      swapAddress
    )

    expect(signature).to.deep.include({
      version: '0x45',
      signatory: signerWallet,
      r: Buffer.from(
        'a35bc1432b2f643462a2b800c8169635a4c047062a7f4623b72ecd6a770d0dab',
        'hex'
      ),
      s: Buffer.from(
        '51b4c9d0a807e46ffba56c75e3ca88b4fdb266bb8ebb8582df7e90c5a8a63db1',
        'hex'
      ),
      v: 28,
    })
  })

  it('Checks that a Version 0x01: signTypedData signature is valid', async () => {
    const order = await orders.getOrder(
      {
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
      },
      true
    )

    const signature = signatures.getTypedDataSignature(
      order,
      signerPrivKey,
      swapAddress
    )

    expect(signature).to.deep.include({
      version: '0x01',
      signatory: signerWallet,
      r: Buffer.from(
        '04c094132c9d0a1d2f4472fdaaed033b941d374c5d202503023d2fc0a2657123',
        'hex'
      ),
      s: Buffer.from(
        '3299ec88d83eda85a93c724d9ac9e05ddc674ad8d34f9ee7e1e6939d0a79b817',
        'hex'
      ),
      v: 28,
    })
  })
})
