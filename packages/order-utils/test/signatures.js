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
        expiry: 1494460800,
        nonce: 101,
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

    const signature = signatures.getPersonalSignature(
      order,
      signerPrivKey,
      swapAddress
    )
    expect(signature).to.deep.include({
      version: '0x45',
      signatory: signerWallet,
      r: Buffer.from(
        '539d93cf04378950229dffac7887fffb2b6a91072273c3b14d8942d109251998',
        'hex'
      ),
      s: Buffer.from(
        '55ee011f45450a444c83fa9c42f179efa3c130e254c175a8bd89560a15c8775e',
        'hex'
      ),
      v: 28,
    })
  })

  it('Checks that a Version 0x01: signTypedData signature is valid', async () => {
    const order = await orders.getOrder(
      {
        expiry: 1494460800,
        nonce: 101,
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
        'c78d7d33e620fdbec03176353f44d684178c079bb5a23c2d3cf72b6d40f32ce9',
        'hex'
      ),
      s: Buffer.from(
        '49dfeaee6792ee5a88e6747d1b49bd836af552db8ad8c6f45ed3d3e8f18248c1',
        'hex'
      ),
      v: 27,
    })
  })
})
