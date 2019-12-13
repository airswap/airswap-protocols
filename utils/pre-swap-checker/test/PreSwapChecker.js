const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')
const FungibleToken = artifacts.require('FungibleToken')
const NonFungibleToken = artifacts.require('NonFungibleToken')
const PreSwapChecker = artifacts.require('PreSwapChecker')
const { assert } = require('chai')
const { emitted, reverted, ok } = require('@airswap/test-utils').assert
const { allowances, balances } = require('@airswap/test-utils').balances
const { getLatestTimestamp } = require('@airswap/test-utils').time
const { orders, signatures } = require('@airswap/order-utils')
const {
  EMPTY_ADDRESS,
  ERC721_INTERFACE_ID,
  GANACHE_PROVIDER,
} = require('@airswap/order-utils').constants

contract('PreSwapChecker', async accounts => {
  const aliceAddress = accounts[0]
  const bobAddress = accounts[1]
  const eveAddress = '0x9d2fB0BCC90C6F3Fa3a98D2C760623a4F6Ee59b4'
  const evePrivKey = Buffer.from(
    '4934d4ff925f39f91e3729fbce52ef12f25fdf93e014e291350f7d314c1a096b',
    'hex'
  )
  let preSwapChecker
  let swapContract
  let swapAddress
  let tokenAST
  let tokenDAI
  let tokenKitty
  let typesLib

  let swap
  let cancelUpTo
  let errorCodes

  describe('Deploying...', async () => {
    it('Deployed Swap contract', async () => {
      typesLib = await Types.new()
      await Swap.link('Types', typesLib.address)
      swapContract = await Swap.new()
      swapAddress = swapContract.address

      swap = swapContract.swap
      cancelUpTo = swapContract.methods['cancelUpTo(uint256)']

      orders.setVerifyingContract(swapAddress)
    })

    it('Deployed SwapChecker contract', async () => {
      await PreSwapChecker.link('Types', typesLib.address)
      preSwapChecker = await PreSwapChecker.new()
    })

    it('Deployed test contract "AST"', async () => {
      tokenAST = await FungibleToken.new()
    })

    it('Deployed test contract "DAI"', async () => {
      tokenDAI = await FungibleToken.new()
    })
  })

  describe('Minting...', async () => {
    it('Mints 1000 AST for Alice', async () => {
      emitted(await tokenAST.mint(aliceAddress, 1000), 'Transfer')
      ok(
        await balances(aliceAddress, [[tokenAST, 1000], [tokenDAI, 0]]),
        'Alice balances are incorrect'
      )
    })

    it('Mints 1000 DAI for Bob', async () => {
      emitted(await tokenDAI.mint(bobAddress, 1000), 'Transfer')
      ok(
        await balances(bobAddress, [[tokenAST, 0], [tokenDAI, 1000]]),
        'Bob balances are incorrect'
      )
    })
  })

  describe('Approving...', async () => {
    it('Checks approvals (Alice 250 AST and 0 DAI, Bob 0 AST and 500 DAI)', async () => {
      emitted(
        await tokenAST.approve(swapAddress, 250, { from: aliceAddress }),
        'Approval'
      )
      emitted(
        await tokenDAI.approve(swapAddress, 1000, { from: bobAddress }),
        'Approval'
      )
      ok(
        await allowances(aliceAddress, swapAddress, [
          [tokenAST, 250],
          [tokenDAI, 0],
        ])
      )
      ok(
        await allowances(bobAddress, swapAddress, [
          [tokenAST, 0],
          [tokenDAI, 1000],
        ])
      )
    })
  })

  describe('Swaps (Fungible)', async () => {
    let order

    before('Alice creates an order for Bob (200 AST for 50 DAI)', async () => {
      order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 200,
        },
        sender: {
          wallet: bobAddress,
          token: tokenDAI.address,
          amount: 50,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )
    })

    it('Checks fillable order is empty error array', async () => {
      errorCodes = await preSwapChecker.checkSwapSwap.call(order, {
        from: bobAddress,
      })
      assert.include(errorCodes[0], EMPTY_ADDRESS)
    })

    it('Checks that Alice cannot swap with herself (200 AST for 50 AST)', async () => {
      const selfOrder = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 200,
        },
        sender: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 50,
        },
      })

      errorCodes = await preSwapChecker.checkSwapSwap.call(selfOrder, {
        from: bobAddress,
      })

      const error = web3.utils.toAscii(errorCodes[0])
      const error1 = web3.utils.toAscii(errorCodes[1])
      assert.include(error, 'INVALID_SELF_TRANSFER')
      assert.include(error1, 'SIGNER_UNAUTHORIZED')
    })

    it('Checks error messages for invalid balances and approvals', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 200000,
        },
        sender: {
          wallet: bobAddress,
          token: tokenAST.address,
          amount: 200000,
        },
      })

      errorCodes = await preSwapChecker.checkSwapSwap.call(order, {
        from: bobAddress,
      })

      assert.include(web3.utils.toAscii(errorCodes[0]), 'SENDER_BALANCE')
      assert.include(web3.utils.toAscii(errorCodes[1]), 'SENDER_ALLOWANCE')
      assert.include(web3.utils.toAscii(errorCodes[2]), 'SIGNER_BALANCE')
      assert.include(web3.utils.toAscii(errorCodes[3]), 'SIGNER_ALLOWANCE')
    })

    it('Checks filled order emits error', async () => {
      // filled default order
      emitted(await swap(order, { from: bobAddress }), 'Swap')

      // Try to check if this order can be filled a second time
      errorCodes = await preSwapChecker.checkSwapSwap.call(order, {
        from: bobAddress,
      })
      assert.include(
        web3.utils.toAscii(errorCodes[0]),
        'ORDER_TAKEN_OR_CANCELLED'
      )
    })

    it('Checks expired, low nonced, and invalid sig order emits error', async () => {
      emitted(await cancelUpTo(10, { from: aliceAddress }), 'CancelUpTo')

      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 20,
        },
        sender: {
          wallet: bobAddress,
          token: tokenDAI.address,
          amount: 5,
        },
        expiry: (await getLatestTimestamp()) - 10, // expired time
        nonce: 5, // nonce below minimum threshold
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )
      // add an invalid signature
      order.signature.v = 3

      // Try to check if this order can be filled a second time
      errorCodes = await preSwapChecker.checkSwapSwap.call(order, {
        from: bobAddress,
      })

      assert.include(web3.utils.toAscii(errorCodes[0]), 'ORDER_EXPIRED')
      assert.include(web3.utils.toAscii(errorCodes[1]), 'NONCE_TOO_LOW')
      assert.include(web3.utils.toAscii(errorCodes[2]), 'INVALID_SIG')
    })

    it('Alice authorizes Carol to make orders on her behalf', async () => {
      emitted(
        await swapContract.authorizeSigner(eveAddress, {
          from: aliceAddress,
        }),
        'AuthorizeSigner'
      )
    })

    it('Check from a different approved signer and empty sender address', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 20,
        },
        sender: {
          wallet: EMPTY_ADDRESS,
          token: tokenDAI.address,
          amount: 50000,
        },
      })

      order.signature = signatures.getPrivateKeySignature(
        order,
        evePrivKey,
        swapAddress
      )

      order.signature.signatory = eveAddress

      errorCodes = await preSwapChecker.checkSwapSwap.call(order, {
        from: bobAddress,
      })

      assert.include(errorCodes[0], EMPTY_ADDRESS)
    })
  })

  describe('Deploying non-fungible token...', async () => {
    it('Deployed test contract "Collectible"', async () => {
      tokenKitty = await NonFungibleToken.new()
    })
  })

  describe('Minting and testing non-fungible token...', async () => {
    it('Mints a kitty collectible (#54321) for Bob', async () => {
      emitted(await tokenKitty.mint(bobAddress, 54321), 'NFTTransfer')
      ok(
        await balances(bobAddress, [[tokenKitty, 1]]),
        'Bob balances are incorrect'
      )
    })

    it('Alice tries to buys non-owned Kitty #54320 from Bob for 50 AST causes revert', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 50,
        },
        sender: {
          wallet: bobAddress,
          token: tokenKitty.address,
          id: 54320,
          kind: ERC721_INTERFACE_ID,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )
      await reverted(
        preSwapChecker.checkSwapSwap.call(order, { from: bobAddress }),
        'revert ERC721: owner query for nonexistent token'
      )
    })

    it('Alice tries to buys non-approved Kitty #54321 from Bob for 50 AST', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenAST.address,
          amount: 50,
        },
        sender: {
          wallet: bobAddress,
          token: tokenKitty.address,
          id: 54321,
          kind: ERC721_INTERFACE_ID,
        },
      })

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

      order.signature.version = '0x99' // incorrect version

      errorCodes = await preSwapChecker.checkSwapSwap.call(order, {
        from: bobAddress,
      })
      assert.include(web3.utils.toAscii(errorCodes[0]), 'SENDER_ALLOWANCE')
      assert.include(web3.utils.toAscii(errorCodes[1]), 'INVALID_SIG')
    })
  })
})
