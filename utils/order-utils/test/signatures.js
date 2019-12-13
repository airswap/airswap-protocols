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
        amount: '0',
      },
      sender: {
        wallet: senderWallet,
        token: WETHAddress,
        amount: '0',
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
        '408c8d6839154a95f768a0229f8d006cc1ae40e96ae689dc63134d3cc6e226a7',
        'hex'
      ),
      s: Buffer.from(
        '3c0bdc32aead5ac026854e79b64704325ec9dcef1d910e5e3fbed9094aebb76d',
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
          amount: '0',
        },
        sender: {
          wallet: senderWallet,
          token: WETHAddress,
          amount: '0',
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
        '6415c617c746470f8df539b1027a0fa97e95ac23433d131528476576c7947fc1',
        'hex'
      ),
      s: Buffer.from(
        '3379b829a64d9fa6bbdead890783739c38a225d7fa74544105395dc46ab6423d',
        'hex'
      ),
      v: 27,
    })
  })
})
