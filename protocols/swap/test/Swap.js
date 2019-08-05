const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')
const FungibleToken = artifacts.require('FungibleToken')
const NonFungibleToken = artifacts.require('NonFungibleToken')
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time

const {
  emitted,
  reverted,
  notEmitted,
  ok,
  equal,
} = require('@airswap/test-utils').assert
const { allowances, balances } = require('@airswap/test-utils').balances
const { getLatestTimestamp, getTimestampPlusDays, advanceTime } = require('@airswap/test-utils').time
const { orders, signatures } = require('@airswap/order-utils')
const { ERC721_INTERFACE_ID, SECONDS_IN_DAY } = require('@airswap/order-utils').constants

let snapshotId

contract('Swap', async accounts => {
  let aliceAddress = accounts[0]
  let bobAddress = accounts[1]
  let carolAddress = accounts[2]
  let davidAddress = accounts[3]

  let swapContract
  let swapAddress
  let tokenAST
  let tokenDAI
  let tokenTicket
  let tokenKitty

  let swap
  let swapSimple
  let cancel
  let invalidate

  let defaultAuthExpiry

  // One big snapshot - not snapshotting every test
  before('Setup', async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  orders.setKnownAccounts([
    aliceAddress,
    bobAddress,
    carolAddress,
    davidAddress,
  ])

  after(async () => {
    await revertToSnapShot(snapshotId)
  })

  describe('Deploying...', async () => {
    it('Deployed Swap contract', async () => {
      const typesLib = await Types.new()
      await Swap.link(Types, typesLib.address)
      swapContract = await Swap.new()
      swapAddress = swapContract.address

      swap =
        swapContract.methods[
          'swap((uint256,uint256,(address,address,uint256,bytes4),(address,address,uint256,bytes4),(address,address,uint256,bytes4)),(address,uint8,bytes32,bytes32,bytes1))'
        ]
      swapSimple =
        swapContract.methods[
          'swapSimple(uint256,uint256,address,uint256,address,address,uint256,address,uint8,bytes32,bytes32)'
        ]
      cancel = swapContract.methods['cancel(uint256[])']
      invalidate = swapContract.methods['invalidate(uint256)']

      orders.setVerifyingContract(swapAddress)
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
        await tokenAST.approve(swapAddress, 200, { from: aliceAddress }),
        'Approval'
      )
      emitted(
        await tokenDAI.approve(swapAddress, 1000, { from: bobAddress }),
        'Approval'
      )
      ok(
        await allowances(aliceAddress, swapAddress, [
          [tokenAST, 200],
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
    let _order
    let _signature

    before('Alice creates an order for Bob (200 AST for 50 DAI)', async () => {
      const { order, signature } = await orders.getOrder({
        maker: {
          wallet: aliceAddress,
          token: tokenAST.address,
          param: 200,
        },
        taker: {
          wallet: bobAddress,
          token: tokenDAI.address,
          param: 50,
        },
      })
      _order = order
      _signature = signature
    })

    it('Checks that Bob can swap with Alice (200 AST for 50 DAI)', async () => {
      emitted(await swap(_order, _signature, { from: bobAddress }), 'Swap')
    })

    it('Checks balances...', async () => {
      ok(
        await balances(aliceAddress, [[tokenAST, 800], [tokenDAI, 50]]),
        'Alice balances are incorrect'
      )
      ok(
        await balances(bobAddress, [[tokenAST, 200], [tokenDAI, 950]]),
        'Bob balances are incorrect'
      )
    })

    it('Checks that Bob cannot take the same order again (200 AST for 50 DAI)', async () => {
      await reverted(
        swap(_order, _signature, { from: bobAddress }),
        'ORDER_ALREADY_TAKEN'
      )
    })

    it('Checks that Alice cannot trade more than approved (200 AST)', async () => {
      const { order, signature } = await orders.getOrder({
        maker: {
          wallet: aliceAddress,
          token: tokenAST.address,
          param: 200,
        },
      })
      await reverted(swap(order, signature, { from: bobAddress }))
    })

    it('Checks that Bob cannot take an expired order', async () => {
      const { order, signature } = await orders.getOrder({
        maker: {
          wallet: aliceAddress,
        },
        taker: {
          wallet: bobAddress,
        },
        expiry: (await getLatestTimestamp()) - 10,
      })
      await reverted(
        swap(order, signature, { from: bobAddress }),
        'ORDER_EXPIRED'
      )
    })

    it('Checks that an order is expired when expiry == block.timestamp', async () => {
      const ONE_DAY = SECONDS_IN_DAY * 1
      const { order, signature } = await orders.getOrder({
        maker: {
          wallet: aliceAddress,
        },
        taker: {
          wallet: bobAddress,
        },
        expiry: await getTimestampPlusDays(1),
      })
      await advanceTime(ONE_DAY)
      await reverted(
        swap(order, signature, { from: bobAddress }),
        'ORDER_EXPIRED'
      )
      equal(order.expiry, await getLatestTimestamp())
    })

    it('Checks that Bob can not trade more than he holds', async () => {
      const { order, signature } = await orders.getOrder({
        maker: {
          wallet: bobAddress,
          token: tokenDAI.address,
          param: 1000,
        },
        taker: {
          wallet: aliceAddress,
        },
      })
      await reverted(swap(order, signature, { from: aliceAddress }))
    })

    it('Checks remaining balances and approvals', async () => {
      ok(
        await balances(aliceAddress, [[tokenAST, 800], [tokenDAI, 50]]),
        'Alice balances are incorrect'
      )
      ok(
        await balances(bobAddress, [[tokenAST, 200], [tokenDAI, 950]]),
        'Bob balances are incorrect'
      )
      // Alice and Bob swapped 200 AST for 50 DAI above, thereforeL
      // Alice's 200 AST approval is now all gone
      // Bob's 1000 DAI approval has decreased by 50
      ok(
        await allowances(aliceAddress, swapAddress, [
          [tokenAST, 0],
          [tokenDAI, 0],
        ])
      )
      ok(
        await allowances(bobAddress, swapAddress, [
          [tokenAST, 0],
          [tokenDAI, 950],
        ])
      )
    })
  })

  describe('Signer Delegation (Maker-side)', async () => {
    let _order
    let _signature

    before('Alice creates an order for Bob (200 AST for 50 DAI)', async () => {
      const { order, signature } = await orders.getOrder({
        signer: davidAddress,
        maker: {
          wallet: aliceAddress,
          token: tokenAST.address,
          param: 50,
        },
        taker: {
          wallet: bobAddress,
          token: tokenDAI.address,
          param: 10,
        },
      })
      _order = order
      _signature = signature
    })

    it('Checks that David cannot make an order on behalf of Alice', async () => {
      await reverted(
        swap(_order, _signature, { from: bobAddress }),
        'SIGNER_UNAUTHORIZED'
      )
    })

    it('Alice attempts to authorize David to make orders on her behalf with an invalid expiry', async () => {
      const authExpiry = (await getLatestTimestamp()) - 1
      await reverted(
        swapContract.authorize(davidAddress, authExpiry, {
          from: aliceAddress,
        }),
        'INVALID_AUTH_EXPIRY'
      )
    })

    it('Alice authorizes David to make orders on her behalf', async () => {
      defaultAuthExpiry = await orders.generateExpiry(1)
      emitted(
        await swapContract.authorize(davidAddress, defaultAuthExpiry, {
          from: aliceAddress,
        }),
        'Authorize'
      )
    })

    it('Alice approves Swap to spend the rest of her AST', async () => {
      emitted(
        await tokenAST.approve(swapAddress, 800, { from: aliceAddress }),
        'Approval'
      )
    })

    it('Checks that David can make an order on behalf of Alice', async () => {
      emitted(await swap(_order, _signature, { from: bobAddress }), 'Swap')
    })

    it('Alice revokes authorization from David', async () => {
      emitted(
        await swapContract.revoke(davidAddress, { from: aliceAddress }),
        'Revoke'
      )
    })

    it('Checks that David can no longer make orders on behalf of Alice', async () => {
      const { order, signature } = await orders.getOrder({
        signer: davidAddress,
        maker: {
          wallet: aliceAddress,
        },
        taker: {
          wallet: bobAddress,
        },
      })
      await reverted(
        swap(order, signature, { from: bobAddress }),
        'SIGNER_UNAUTHORIZED'
      )
    })

    it('Checks remaining balances and approvals', async () => {
      // Alice and Bob swapped 50 AST for 10 DAI. Previous balances were:
      // Alice 800 AST 50 DAI, Bob 200 AST 950 DAI
      ok(
        await balances(aliceAddress, [[tokenAST, 750], [tokenDAI, 60]]),
        'Alice balances are incorrect'
      )
      ok(
        await balances(bobAddress, [[tokenAST, 250], [tokenDAI, 940]]),
        'Bob balances are incorrect'
      )
      // Alice approved all her AST
      ok(
        await allowances(aliceAddress, swapAddress, [
          [tokenAST, 750],
          [tokenDAI, 0],
        ])
      )
      ok(
        await allowances(bobAddress, swapAddress, [
          [tokenAST, 0],
          [tokenDAI, 940],
        ])
      )
    })
  })

  describe('Sender Delegation (Taker-side)', async () => {
    let _order
    let _signature

    before('Alice creates an order for Bob (50 AST for 10 DAI)', async () => {
      const { order, signature } = await orders.getOrder({
        maker: {
          wallet: aliceAddress,
          token: tokenAST.address,
          param: 50,
        },
        taker: {
          wallet: bobAddress,
          token: tokenDAI.address,
          param: 10,
        },
      })
      _order = order
      _signature = signature
    })

    it('Checks that Carol cannot take an order on behalf of Bob', async () => {
      await reverted(
        swap(_order, _signature, { from: carolAddress }),
        'SENDER_UNAUTHORIZED'
      )
    })

    it('Bob authorizes Carol to take orders on his behalf', async () => {
      emitted(
        await swapContract.authorize(carolAddress, defaultAuthExpiry, {
          from: bobAddress,
        }),
        'Authorize'
      )
    })

    it('Checks that Carol can take an order on behalf of Bob', async () => {
      emitted(await swap(_order, _signature, { from: carolAddress }), 'Swap')
    })

    it('Bob revokes sender authorization from Carol', async () => {
      emitted(
        await swapContract.revoke(carolAddress, { from: bobAddress }),
        'Revoke'
      )
    })

    it('Checks that Carol can no longer take orders on behalf of Bob', async () => {
      const { order, signature } = await orders.getOrder({
        maker: {
          wallet: aliceAddress,
        },
        taker: {
          wallet: bobAddress,
        },
      })
      await reverted(
        swap(order, signature, { from: carolAddress }),
        'SENDER_UNAUTHORIZED'
      )
    })

    it('Checks remaining balances and approvals', async () => {
      // Alice and Bob swapped 50 AST for 10 DAI again. Previous balances were:
      // Alice 750 AST 60 DAI, Bob 250 AST 940 DAI
      ok(
        await balances(aliceAddress, [[tokenAST, 700], [tokenDAI, 70]]),
        'Alice balances are incorrect'
      )
      ok(
        await balances(bobAddress, [[tokenAST, 300], [tokenDAI, 930]]),
        'Bob balances are incorrect'
      )
      ok(
        await allowances(aliceAddress, swapAddress, [
          [tokenAST, 700],
          [tokenDAI, 0],
        ])
      )
      ok(
        await allowances(bobAddress, swapAddress, [
          [tokenAST, 0],
          [tokenDAI, 930],
        ])
      )
    })
  })

  describe('Signer and Sender Delegation (Three Way)', async () => {
    it('Alice approves David to make orders on her behalf', async () => {
      emitted(
        await swapContract.authorize(davidAddress, defaultAuthExpiry, {
          from: aliceAddress,
        }),
        'Authorize'
      )
    })

    it('Bob approves David to take orders on his behalf', async () => {
      emitted(
        await swapContract.authorize(davidAddress, defaultAuthExpiry, {
          from: bobAddress,
        }),
        'Authorize'
      )
    })

    it('Alice gives an unsigned order to David who takes it for Bob', async () => {
      const { order } = await orders.getOrder({
        maker: {
          wallet: aliceAddress,
          token: tokenAST.address,
          param: 25,
        },
        taker: {
          wallet: bobAddress,
          token: tokenDAI.address,
          param: 5,
        },
      })
      emitted(
        await swap(order, signatures.getEmptySignature(), {
          from: davidAddress,
        }),
        'Swap'
      )
    })

    it('Checks remaining balances and approvals', async () => {
      // Alice and Bob swapped 25 AST for 5 DAI. Previous balances were:
      // Alice 700 AST 70 DAI, Bob 300 AST 930 DAI
      ok(
        await balances(aliceAddress, [[tokenAST, 675], [tokenDAI, 75]]),
        'Alice balances are incorrect'
      )
      ok(
        await balances(bobAddress, [[tokenAST, 325], [tokenDAI, 925]]),
        'Bob balances are incorrect'
      )
      ok(
        await allowances(aliceAddress, swapAddress, [
          [tokenAST, 675],
          [tokenDAI, 0],
        ])
      )
      ok(
        await allowances(bobAddress, swapAddress, [
          [tokenAST, 0],
          [tokenDAI, 925],
        ])
      )
    })
  })

  describe('Signer and Sender Delegation (Four Way)', async () => {
    it('Bob approves Carol to take orders on his behalf', async () => {
      emitted(
        await swapContract.authorize(carolAddress, defaultAuthExpiry, {
          from: bobAddress,
        }),
        'Authorize'
      )
    })

    it('David makes an order for Alice, Carol takes the order for Bob', async () => {
      // Alice has already approved David in the previous section
      const { order, signature } = await orders.getOrder({
        signer: davidAddress,
        maker: {
          wallet: aliceAddress,
          token: tokenAST.address,
          param: 25,
        },
        taker: {
          wallet: bobAddress,
          token: tokenDAI.address,
          param: 5,
        },
      })
      emitted(await swap(order, signature, { from: carolAddress }), 'Swap')
    })

    it('Bob revokes the authorization to Carol', async () => {
      emitted(
        await swapContract.revoke(carolAddress, {
          from: bobAddress,
        }),
        'Revoke'
      )
    })

    it('Checks remaining balances and approvals', async () => {
      // Alice and Bob swapped 25 AST for 5 DAI. Previous balances were:
      // Alice 675 AST 75 DAI, Bob 325 AST 925 DAI
      ok(
        await balances(aliceAddress, [[tokenAST, 650], [tokenDAI, 80]]),
        'Alice balances are incorrect'
      )
      ok(
        await balances(bobAddress, [[tokenAST, 350], [tokenDAI, 920]]),
        'Bob balances are incorrect'
      )
      ok(
        await allowances(aliceAddress, swapAddress, [
          [tokenAST, 650],
          [tokenDAI, 0],
        ])
      )
      ok(
        await allowances(bobAddress, swapAddress, [
          [tokenAST, 0],
          [tokenDAI, 920],
        ])
      )
    })
  })

  describe('Cancels', async () => {
    let _orderOne
    let _signatureOne
    let _orderTwo
    let _signatureTwo
    let _orderThree
    let _signatureThree

    before('Alice creates orders with nonces 1, 2, 3', async () => {
      const {
        order: orderOne,
        signature: signatureOne,
      } = await orders.getOrder({
        maker: {
          wallet: aliceAddress,
        },
        nonce: 1,
      })
      const {
        order: orderTwo,
        signature: signatureTwo,
      } = await orders.getOrder({
        maker: {
          wallet: aliceAddress,
        },
        nonce: 2,
      })
      const {
        order: orderThree,
        signature: signatureThree,
      } = await orders.getOrder({
        maker: {
          wallet: aliceAddress,
        },
        nonce: 3,
      })

      _orderOne = orderOne
      _signatureOne = signatureOne
      _orderTwo = orderTwo
      _signatureTwo = signatureTwo
      _orderThree = orderThree
      _signatureThree = signatureThree
    })

    it('Checks that Alice is able to cancel order with nonce 1', async () => {
      emitted(await cancel([_orderOne.nonce], { from: aliceAddress }), 'Cancel')
    })

    it('Checks that Alice is unable to cancel order with nonce 1 twice', async () => {
      notEmitted(
        await cancel([_orderOne.nonce], { from: aliceAddress }),
        'Cancel'
      )
    })

    it('Checks that Bob is unable to take an order with nonce 1', async () => {
      await reverted(
        swap(_orderOne, _signatureOne, { from: bobAddress }),
        'ORDER_ALREADY_CANCELED'
      )
    })

    it('Checks that Alice is able to set a minimum nonce of 4', async () => {
      emitted(await invalidate(4, { from: aliceAddress }), 'Invalidate')
    })

    it('Checks that Bob is unable to take an order with nonce 2', async () => {
      await reverted(
        swap(_orderTwo, _signatureTwo, { from: bobAddress }),
        'NONCE_TOO_LOW'
      )
    })

    it('Checks that Bob is unable to take an order with nonce 3', async () => {
      await reverted(
        swap(_orderThree, _signatureThree, { from: bobAddress }),
        'NONCE_TOO_LOW'
      )
    })

    it('Checks existing balances (Alice 650 AST and 80 DAI, Bob 750 AST and 920 DAI)', async () => {
      // No swaps happened in this section
      ok(
        await balances(aliceAddress, [[tokenAST, 650], [tokenDAI, 80]]),
        'Alice balances are incorrect'
      )
      ok(
        await balances(bobAddress, [[tokenAST, 350], [tokenDAI, 920]]),
        'Bob balances are incorrect'
      )
      ok(
        await allowances(aliceAddress, swapAddress, [
          [tokenAST, 650],
          [tokenDAI, 0],
        ])
      )
      ok(
        await allowances(bobAddress, swapAddress, [
          [tokenAST, 0],
          [tokenDAI, 920],
        ])
      )
    })
  })

  describe('Swaps with Fees', async () => {
    it('Checks that Carol gets paid 50 AST for facilitating a trade between Alice and Bob', async () => {
      const { order, signature } = await orders.getOrder({
        maker: {
          wallet: aliceAddress,
          token: tokenAST.address,
          param: 100,
        },
        taker: {
          wallet: bobAddress,
          token: tokenDAI.address,
          param: 50,
        },
        affiliate: {
          wallet: carolAddress,
          token: tokenAST.address,
          param: 50,
        },
      })
      emitted(await swap(order, signature, { from: bobAddress }), 'Swap')
    })

    it('Checks balances...', async () => {
      ok(
        await balances(aliceAddress, [[tokenAST, 500], [tokenDAI, 130]]),
        'Alice balances are incorrect'
      )
      ok(
        await balances(bobAddress, [[tokenAST, 450], [tokenDAI, 870]]),
        'Bob balances are incorrect'
      )
      ok(
        await balances(carolAddress, [[tokenAST, 50], [tokenDAI, 0]]),
        'Carol balances are incorrect'
      )
    })
  })

  describe('Swap (Simple)', async () => {
    let _order
    let _signature

    before('Alice creates an order for id "12345"', async () => {
      const { order } = await orders.getOrder({
        maker: {
          wallet: aliceAddress,
          token: tokenAST.address,
          param: 50,
        },
        taker: {
          wallet: bobAddress,
          token: tokenDAI.address,
          param: 10,
        },
      })
      _order = order
      _signature = await signatures.getSimpleSignature(
        order,
        aliceAddress,
        swapAddress
      )
    })

    it('Checks that Carol cannot take a (Simple) order on behalf of Bob', async () => {
      await reverted(
        swapSimple(
          _order.nonce,
          _order.expiry,
          _order.maker.wallet,
          _order.maker.param,
          _order.maker.token,
          _order.taker.wallet,
          _order.taker.param,
          _order.taker.token,
          _signature.v,
          _signature.r,
          _signature.s,
          { from: carolAddress }
        ),
        'SENDER_UNAUTHORIZED'
      )
    })

    it('Checks that a Swap (Simple) succeeds', async () => {
      emitted(
        await swapSimple(
          _order.nonce,
          _order.expiry,
          _order.maker.wallet,
          _order.maker.param,
          _order.maker.token,
          _order.taker.wallet,
          _order.taker.param,
          _order.taker.token,
          _signature.v,
          _signature.r,
          _signature.s,
          { from: bobAddress }
        ),
        'Swap'
      )
    })

    it('Checks that a Swap (Simple) fails because order is no longer available', async () => {
      await reverted(
        swapSimple(
          _order.nonce,
          _order.expiry,
          _order.maker.wallet,
          _order.maker.param,
          _order.maker.token,
          _order.taker.wallet,
          _order.taker.param,
          _order.taker.token,
          _signature.v,
          _signature.r,
          _signature.s,
          { from: bobAddress }
        ),
        'ORDER_UNAVAILABLE'
      )
    })

    it('Checks that an invalid simple signature will fail', async () => {
      const { order } = await orders.getOrder({
        maker: {
          wallet: aliceAddress,
          token: tokenAST.address,
          param: 100,
        },
        taker: {
          wallet: bobAddress,
          token: tokenDAI.address,
          param: 50,
        },
      })

      // Signs with bobAddress rather than alice Address.
      const signature = await signatures.getSimpleSignature(
        order,
        bobAddress,
        swapAddress
      )
      await reverted(
        swapSimple(
          order.nonce,
          order.expiry,
          order.maker.wallet,
          order.maker.param,
          order.maker.token,
          order.taker.wallet,
          order.taker.param,
          order.taker.token,
          signature.v,
          signature.r,
          signature.s,
          { from: bobAddress }
        ),
        'INVALID'
      )
    })
  })

  describe('Maker Delegation for Swap (Simple)', async () => {
    it('Alice gives an unsigned order to David who takes it for Bob', async () => {
      const { order } = await orders.getOrder({
        maker: {
          wallet: aliceAddress,
          token: tokenAST.address,
          param: 20,
        },
        taker: {
          wallet: bobAddress,
          token: tokenDAI.address,
          param: 5,
        },
      })
      const signature = signatures.getEmptySignature()
      emitted(
        await swapSimple(
          order.nonce,
          order.expiry,
          order.maker.wallet,
          order.maker.param,
          order.maker.token,
          order.taker.wallet,
          order.taker.param,
          order.taker.token,
          signature.v,
          signature.r,
          signature.s,
          { from: davidAddress }
        ),
        'Swap'
      )
    })
  })

  describe('Swap with Public Orders (No Taker Set)', async () => {
    it('Checks that a Swap succeeds without a taker wallet set', async () => {
      const { order, signature } = await orders.getOrder({
        maker: {
          wallet: aliceAddress,
          token: tokenAST.address,
          param: 5,
        },
        taker: {
          token: tokenDAI.address,
          param: 0,
        },
      })
      emitted(await swap(order, signature, { from: bobAddress }), 'Swap') //, { takerAddress: bobAddress })
    })

    it('Checks that a Swap (Simple) succeeds without a taker wallet set', async () => {
      const { order } = await orders.getOrder({
        maker: {
          wallet: aliceAddress,
          token: tokenAST.address,
          param: 25,
        },
        taker: {
          token: tokenDAI.address,
          param: 5,
        },
      })

      const signature = await signatures.getSimpleSignature(
        order,
        aliceAddress,
        swapAddress
      )

      emitted(
        await swapSimple(
          order.nonce,
          order.expiry,
          order.maker.wallet,
          order.maker.param,
          order.maker.token,
          order.taker.wallet,
          order.taker.param,
          order.taker.token,
          signature.v,
          signature.r,
          signature.s,
          { from: bobAddress }
        ),
        'Swap'
      ) //, { takerAddress: bobAddress })
    })
  })

  describe('Deploying...', async () => {
    it('Deployed test contract "ConcertTicket"', async () => {
      tokenTicket = await NonFungibleToken.new()
    })

    it('Deployed test contract "Collectible"', async () => {
      tokenKitty = await NonFungibleToken.new()
    })
  })

  describe('Minting...', async () => {
    it('Mints a concert ticket (#12345) for Alice', async () => {
      emitted(await tokenTicket.mint(aliceAddress, 12345), 'NFTTransfer')
      ok(
        await balances(aliceAddress, [[tokenTicket, 1]]),
        'Alice balances are incorrect'
      )
    })

    it('Mints a kitty collectible (#54321) for Bob', async () => {
      emitted(await tokenKitty.mint(bobAddress, 54321), 'NFTTransfer')
      ok(
        await balances(bobAddress, [[tokenKitty, 1]]),
        'Bob balances are incorrect'
      )
    })
  })

  describe('Swaps (Non-Fungible)', async () => {
    it('Alice approves Swap to transfer her concert ticket', async () => {
      emitted(
        await tokenTicket.approve(swapAddress, 12345, { from: aliceAddress }),
        'NFTApproval'
      )
    })

    it('Bob buys Ticket #12345 from Alice for 1 DAI', async () => {
      const { order, signature } = await orders.getOrder({
        maker: {
          wallet: aliceAddress,
          token: tokenTicket.address,
          param: 12345,
          kind: ERC721_INTERFACE_ID,
        },
        taker: {
          wallet: bobAddress,
          token: tokenDAI.address,
          param: 100,
        },
      })
      emitted(await swap(order, signature, { from: bobAddress }), 'Swap')
    })

    it('Bob approves Swap to transfer his kitty collectible', async () => {
      emitted(
        await tokenKitty.approve(swapAddress, 54321, { from: bobAddress }),
        'NFTApproval'
      )
    })

    it('Alice buys Kitty #54321 from Bob for 50 AST', async () => {
      const { order, signature } = await orders.getOrder({
        maker: {
          wallet: aliceAddress,
          token: tokenAST.address,
          param: 50,
        },
        taker: {
          wallet: bobAddress,
          token: tokenKitty.address,
          param: 54321,
          kind: ERC721_INTERFACE_ID,
        },
      })
      emitted(await swap(order, signature, { from: bobAddress }), 'Swap')
    })

    it('Alice approves Swap to transfer her kitty collectible', async () => {
      emitted(
        await tokenKitty.approve(swapAddress, 54321, { from: aliceAddress }),
        'NFTApproval'
      )
    })

    it('Checks that Carol gets paid Kitty #54321 for facilitating a trade between Alice and Bob', async () => {
      const { order, signature } = await orders.getOrder({
        maker: {
          wallet: aliceAddress,
          token: tokenAST.address,
          param: 50,
        },
        taker: {
          wallet: bobAddress,
          token: tokenDAI.address,
          param: 50,
        },
        affiliate: {
          wallet: carolAddress,
          token: tokenKitty.address,
          param: 54321,
          kind: ERC721_INTERFACE_ID,
        },
      })
      emitted(await swap(order, signature, { from: bobAddress }), 'Swap')
    })
  })

  describe('Signatures', async () => {
    const eveAddress = '0x9d2fB0BCC90C6F3Fa3a98D2C760623a4F6Ee59b4'
    const evePrivKey = Buffer.from(
      '4934d4ff925f39f91e3729fbce52ef12f25fdf93e014e291350f7d314c1a096b',
      'hex'
    )

    it('Checks that an invalid maker signature will revert', async () => {
      const { order } = await orders.getOrder({
        maker: {
          wallet: aliceAddress,
        },
        taker: {
          wallet: bobAddress,
        },
      })
      const signature = signatures.getPrivateKeySignature(
        order,
        evePrivKey,
        swapAddress
      )
      signature.signer = aliceAddress
      await reverted(
        swap(order, signature, { from: bobAddress }),
        'SIGNATURE_INVALID'
      )
    })

    it('Alice authorizes Eve to make orders on her behalf', async () => {
      emitted(
        await swapContract.authorize(eveAddress, defaultAuthExpiry, {
          from: aliceAddress,
        }),
        'Authorize'
      )
    })

    it('Checks that an invalid delegate signature will revert', async () => {
      const { order: orderOne } = await orders.getOrder({
        maker: {
          wallet: aliceAddress,
          token: tokenAST.address,
          param: 0,
        },
        taker: {
          wallet: bobAddress,
          token: tokenDAI.address,
          param: 0,
        },
      })
      const { order: orderTwo } = await orders.getOrder({
        maker: {
          wallet: aliceAddress,
        },
        taker: {
          wallet: bobAddress,
        },
      })
      const signatureTwo = signatures.getPrivateKeySignature(
        orderTwo,
        evePrivKey,
        swapAddress
      )
      await reverted(
        swap(orderOne, signatureTwo, { from: bobAddress }),
        'SIGNATURE_INVALID'
      )
    })
    it('Checks that an invalid signature version will revert', async () => {
      const { order } = await orders.getOrder({
        maker: {
          wallet: aliceAddress,
        },
        taker: {
          wallet: bobAddress,
        },
      })
      const signature = signatures.getPrivateKeySignature(
        order,
        evePrivKey,
        swapAddress
      )
      signature.version = Buffer.from('00', 'hex')
      await reverted(
        swap(order, signature, { from: bobAddress }),
        'SIGNATURE_INVALID'
      )
    })
    it('Checks that a private key signature is valid', async () => {
      const { order } = await orders.getOrder({
        maker: {
          wallet: eveAddress,
          token: tokenAST.address,
          param: 0,
        },
        taker: {
          wallet: aliceAddress,
          token: tokenDAI.address,
          param: 0,
        },
      })
      const signature = signatures.getPrivateKeySignature(
        order,
        evePrivKey,
        swapAddress
      )
      emitted(await swap(order, signature, { from: aliceAddress }), 'Swap')
    })
    it('Checks that a typed data (EIP712) signature is valid', async () => {
      const { order } = await orders.getOrder({
        maker: {
          wallet: eveAddress,
          token: tokenAST.address,
          param: 0,
        },
        taker: {
          wallet: aliceAddress,
          token: tokenDAI.address,
          param: 0,
        },
      })
      const signature = signatures.getTypedDataSignature(
        order,
        evePrivKey,
        swapAddress
      )
      emitted(await swap(order, signature, { from: aliceAddress }), 'Swap')
    })
  })
})
