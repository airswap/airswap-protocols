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
    const order = await orders.getOrder(
      {
        swapContract: swapAddress,
        expiry: '1494460800',
        nonce: '101',
        signer: {
          wallet: signerWallet,
          token: ASTAddress,
          param: '0',
        },
        sender: {
          swapContract: swapAddress,
          wallet: senderWallet,
          token: WETHAddress,
          param: '0',
        },
      },
      true
    )

    const signature = signatures.getPersonalSignature(
      order,
      signerPrivKey,
      swapAddress
    )

    expect(signature).to.deep.include({
      version: '0x45',
      signatory: signerWallet,
      r: Buffer.from(
        '111e4503ecef693936a96849feeb3b42f3966fd351514cb5e1a607bf3f554652',
        'hex'
      ),
      s: Buffer.from(
        '283754eab656d868fa6c2f7cd7617086c67bf2d39c3f1004729f083d87c7b1d8',
        'hex'
      ),
      v: 27,
    })
  })

  it('Checks that a Version 0x01: signTypedData signature is valid', async () => {
    const order = await orders.getOrder(
      {
        swapContract: swapAddress,
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
        '6113019103b71d2f7ec6bc1b28960c1c9b69125b3b31edb4094375052c56623b',
        'hex'
      ),
      s: Buffer.from(
        '1c0d31cfa9bdb85f47af8b799123d2396c1cb48212942584f69d862c8860340d',
        'hex'
      ),
      v: 28,
    })
  })
})
