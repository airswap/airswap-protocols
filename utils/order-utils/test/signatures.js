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
        'f96f06d53e654f7b7d32f66637a18aa09020960071c2d1eac5879697d5bbfdda',
        'hex'
      ),
      s: Buffer.from(
        '20afb92d44bb4ab4cfe7d4cae6b4c45807c54af27ad3e59532f1d92fe2c634a8',
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
        '3d884c1025eb35ec6f6d4305bebe65416ee7e8acb48ceefece3a585f74e44030',
        'hex'
      ),
      s: Buffer.from(
        '31f3161d9a3451841ff3fe6bd16738e17a284ea2f8c235ea769d04bf6aa12855',
        'hex'
      ),
      v: 27,
    })
  })
})
