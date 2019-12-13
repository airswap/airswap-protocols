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
        id: '0',
      },
      sender: {
        wallet: senderWallet,
        token: WETHAddress,
        amount: '0',
        id: '0',
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
        '83aefc06809f0603dfc28a2f944f119c22e2b147ea7d6fae613032ca0e0510c6',
        'hex'
      ),
      s: Buffer.from(
        '71892b3d04b0e7a92e7102b93b5f7d7086691ff35958f5eb25225843406e4a83',
        'hex'
      ),
      v: 27,
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
        '904cc14f5133f9db1946dca6bfd163e01af043d280e76b42175791aefce8f139',
        'hex'
      ),
      s: Buffer.from(
        '699e9c4dc85d06a85b2fb77516a879953678a260785810fa93fdc224bb435c4b',
        'hex'
      ),
      v: 27,
    })
  })
})
