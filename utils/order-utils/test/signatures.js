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
        '544703458e05a5f8df1ed75c58e104250acb6a092c6a20cc1320151d1c39db10',
        'hex'
      ),
      s: Buffer.from(
        '4ec8415e71a9f85d29857827def7c9a336701aa287967a57dc1662c046585c1d',
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
        'c678976182bf105a26fe40f264b806688b2564a81a42aa279961fc08b2061ec9',
        'hex'
      ),
      s: Buffer.from(
        '0b6a46dacd735b8e9d69306f814123df0177654a35cce1b7ec87bb89b0f61cf9',
        'hex'
      ),
      v: 27,
    })
  })
})
