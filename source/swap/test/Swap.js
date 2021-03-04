const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')
const FungibleToken = artifacts.require('FungibleToken')
const TransferHandlerRegistry = artifacts.require('TransferHandlerRegistry')
const ERC20TransferHandler = artifacts.require('ERC20TransferHandler')

const ethers = require('ethers')
const { createOrder, signOrder, createSignature } = require('@airswap/utils')
const { tokenKinds, SECONDS_IN_DAY } = require('@airswap/constants')
const { emptySignature } = require('@airswap/types')

const {
  assert: { emitted, reverted, notEmitted, ok, equal },
  balances: { allowances, balances },
  functions: { getTestWallet },
  time: { getLatestTimestamp, getTimestampPlusDays, advanceTime },
} = require('@airswap/test-utils')

const PROVIDER_URL = web3.currentProvider.host

contract('Swap', async accounts => {
  const aliceAddress = accounts[0]
  const bobAddress = accounts[1]
  const carolAddress = accounts[2]
  const davidAddress = accounts[3]

  const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL)
  const aliceSigner = provider.getSigner(aliceAddress)
  const davidSigner = provider.getSigner(davidAddress)

  const eveSigner = getTestWallet()

  const UNKNOWN_KIND = '0xffffffff'
  let swapContract
  let swapContractAddress
  let tokenAST
  let tokenDAI
  let transferHandlerRegistry

  let swap
  let cancel
  let cancelUpTo

  describe('Deploying...', async () => {
    it('Deployed Swap contract', async () => {
      transferHandlerRegistry = await TransferHandlerRegistry.new()
      const typesLib = await Types.new()
      await Swap.link('Types', typesLib.address)
      swapContract = await Swap.new(transferHandlerRegistry.address)
      swapContractAddress = swapContract.address

      swap = swapContract.swap
      cancel = swapContract.methods['cancel(uint256[])']
      cancelUpTo = swapContract.methods['cancelUpTo(uint256)']
    })

    it('Deployed test contract "AST"', async () => {
      tokenAST = await FungibleToken.new()
    })

    it('Deployed test contract "DAI"', async () => {
      tokenDAI = await FungibleToken.new()
    })

    it('Check that TransferHandlerRegistry correctly set', async () => {
      equal(await swapContract.registry.call(), transferHandlerRegistry.address)
    })

    it('Set up TokenRegistry and ERC20TransferHandler', async () => {
      const erc20TransferHandler = await ERC20TransferHandler.new()

      await transferHandlerRegistry.addTransferHandler(
        tokenKinds.ERC20,
        erc20TransferHandler.address
      )
    })
  })

  describe('Minting ERC20 tokens (AST and DAI)...', async () => {
    it('Mints 1000 AST for Alice', async () => {
      emitted(await tokenAST.mint(aliceAddress, 1000), 'Transfer')
      ok(
        await balances(aliceAddress, [
          [tokenAST, 1000],
          [tokenDAI, 0],
        ]),
        'Alice balances are incorrect'
      )
    })

    it('Mints 1000 DAI for Bob', async () => {
      emitted(await tokenDAI.mint(bobAddress, 1000), 'Transfer')
      ok(
        await balances(bobAddress, [
          [tokenAST, 0],
          [tokenDAI, 1000],
        ]),
        'Bob balances are incorrect'
      )
    })
  })

  describe('Approving ERC20 tokens (AST and DAI)...', async () => {
    it('Checks approvals (Alice 250 AST and 0 DAI, Bob 0 AST and 1000 DAI)', async () => {
      emitted(
        await tokenAST.approve(swapContractAddress, 250, {
          from: aliceAddress,
        }),
        'Approval'
      )
      emitted(
        await tokenDAI.approve(swapContractAddress, 1000, { from: bobAddress }),
        'Approval'
      )
      ok(
        await allowances(aliceAddress, swapContractAddress, [
          [tokenAST, 250],
          [tokenDAI, 0],
        ])
      )
      ok(
        await allowances(bobAddress, swapContractAddress, [
          [tokenAST, 0],
          [tokenDAI, 1000],
        ])
      )
    })
  })

  describe('Swaps (Fungible)', async () => {
    let _order

    before('Alice creates an order for Bob (200 AST for 50 DAI)', async () => {
      _order = await signOrder(
        createOrder({
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
          expiry: await getTimestampPlusDays(1),
        }),
        aliceSigner,
        swapContractAddress
      )
    })

    it('Checks that Alice cannot swap more than balance approved (2000 AST for 50 DAI)', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
            token: tokenAST.address,
            amount: 2000,
          },
          sender: {
            wallet: bobAddress,
            token: tokenDAI.address,
            amount: 50,
          },
          expiry: await getTimestampPlusDays(1),
        }),
        aliceSigner,
        swapContractAddress
      )
      await reverted(swap(order, { from: bobAddress }), 'TRANSFER_FAILED')
    })

    it('Checks that Bob can swap with Alice (200 AST for 50 DAI)', async () => {
      emitted(await swap(_order, { from: bobAddress }), 'Swap', e => {
        return e.signerWallet === aliceAddress
      })
    })
    it('Checks that Alice cannot swap with herself (200 AST for 50 AST)', async () => {
      const selfOrder = await signOrder(
        createOrder({
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
          expiry: await getTimestampPlusDays(1),
        }),
        aliceSigner,
        swapContractAddress
      )

      await reverted(
        swap(selfOrder, { from: aliceAddress }),
        'SELF_TRANSFER_INVALID'
      )
    })

    it('Alice sends Bob with an unknown kind for 10 DAI', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
            token: tokenAST.address,
            amount: 1,
            kind: UNKNOWN_KIND,
          },
          sender: {
            wallet: bobAddress,
            token: tokenDAI.address,
            amount: 10,
          },
          expiry: await getTimestampPlusDays(1),
        }),
        aliceSigner,
        swapContractAddress
      )

      await reverted(swap(order, { from: bobAddress }), 'TOKEN_KIND_UNKNOWN')
    })

    it('Checks balances...', async () => {
      ok(
        await balances(aliceAddress, [
          [tokenAST, 800],
          [tokenDAI, 50],
        ]),
        'Alice balances are incorrect'
      )
      ok(
        await balances(bobAddress, [
          [tokenAST, 200],
          [tokenDAI, 950],
        ]),
        'Bob balances are incorrect'
      )
    })
    it('Checks that Bob cannot take the same order again (200 AST for 50 DAI)', async () => {
      await reverted(
        swap(_order, { from: bobAddress }),
        'ORDER_TAKEN_OR_CANCELLED'
      )
    })

    it('Checks balances...', async () => {
      ok(
        await balances(aliceAddress, [
          [tokenAST, 800],
          [tokenDAI, 50],
        ]),
        'Alice balances are incorrect'
      )
      ok(
        await balances(bobAddress, [
          [tokenAST, 200],
          [tokenDAI, 950],
        ]),
        'Bob balances are incorrect'
      )
    })

    it('Checks that Alice cannot trade more than approved (200 AST)', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
            token: tokenAST.address,
            amount: 200,
          },
          sender: {
            wallet: bobAddress,
            token: tokenDAI.address,
            amount: 10,
          },
          expiry: await getTimestampPlusDays(1),
        }),
        aliceSigner,
        swapContractAddress
      )

      await reverted(swap(order, { from: bobAddress }))
    })

    it('Checks that Bob cannot take an expired order', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
          },
          sender: {
            wallet: bobAddress,
          },
          expiry: (await getLatestTimestamp()) - 10,
        }),
        aliceSigner,
        swapContractAddress
      )

      await reverted(swap(order, { from: bobAddress }), 'ORDER_EXPIRED')
    })

    it('Checks that an order is expired when expiry == block.timestamp', async () => {
      // with this method, sometimes order.expiry is 1 second before block.timestamp
      // however ~50% of the time they are equal. This is due to the fact that in the
      // time it takes to create an order, some number of milliseconds pass. Sometimes
      // that pushes the current time into the next second, and sometimes it doesnt.
      // Therefore sometimes the current time is the same time as the expiry, and sometimes
      // the current time is one second after the expiry
      const ONE_DAY = SECONDS_IN_DAY * 1
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
          },
          sender: {
            wallet: bobAddress,
          },
          expiry: await getTimestampPlusDays(1),
        }),
        aliceSigner,
        swapContractAddress
      )

      await advanceTime(ONE_DAY)
      await reverted(swap(order, { from: bobAddress }), 'ORDER_EXPIRED')
    })
    it('Checks that Bob can not trade more than he holds', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: bobAddress,
            token: tokenDAI.address,
            amount: 1000,
          },
          sender: {
            wallet: aliceAddress,
          },
        }),
        aliceSigner,
        swapContractAddress
      )

      await reverted(swap(order, { from: aliceAddress }))
    })

    it('Checks remaining balances and approvals', async () => {
      ok(
        await balances(aliceAddress, [
          [tokenAST, 800],
          [tokenDAI, 50],
        ]),
        'Alice balances are incorrect'
      )
      ok(
        await balances(bobAddress, [
          [tokenAST, 200],
          [tokenDAI, 950],
        ]),
        'Bob balances are incorrect'
      )
      // Alice and Bob swapped 200 AST for 50 DAI above, thereforeL
      // Alice's 200 AST approval is now all gone
      // Bob's 1000 DAI approval has decreased by 50
      ok(
        await allowances(aliceAddress, swapContractAddress, [
          [tokenAST, 50],
          [tokenDAI, 0],
        ])
      )
      ok(
        await allowances(bobAddress, swapContractAddress, [
          [tokenAST, 0],
          [tokenDAI, 950],
        ])
      )
    })

    it('Checks that adding an affiliate address but empty token address and amount still swaps', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
            token: tokenAST.address,
            amount: 1,
          },
          sender: {
            wallet: bobAddress,
            token: tokenDAI.address,
            amount: 1,
          },
          affiliate: {
            wallet: carolAddress,
            amount: 0,
          },
          expiry: await getTimestampPlusDays(1),
        }),
        aliceSigner,
        swapContractAddress
      )

      emitted(await swap(order, { from: bobAddress }), 'Swap')
    })

    it('Transfers tokens back for future tests', async () => {
      // now transfer the tokens back to leave balances unchanged for future tests
      await tokenDAI.transfer(bobAddress, 1, { from: aliceAddress })
      await tokenAST.transfer(aliceAddress, 1, { from: bobAddress })

      // previous balances unchanged
      ok(
        await balances(aliceAddress, [
          [tokenAST, 800],
          [tokenDAI, 50],
        ]),
        'Alice balances are incorrect'
      )
      ok(
        await balances(bobAddress, [
          [tokenAST, 200],
          [tokenDAI, 950],
        ]),
        'Bob balances are incorrect'
      )

      // increase allowances again
      await tokenAST.approve(swapContractAddress, 50, { from: aliceAddress })
      await tokenDAI.approve(swapContractAddress, 950, { from: bobAddress })

      ok(
        await allowances(aliceAddress, swapContractAddress, [
          [tokenAST, 50],
          [tokenDAI, 0],
        ])
      )
      ok(
        await allowances(bobAddress, swapContractAddress, [
          [tokenAST, 0],
          [tokenDAI, 950],
        ])
      )
    })
  })

  describe('Signer Delegation (Signer-side)', async () => {
    let _order
    let _unsignedOrder

    before(
      'David makes an order for Alice and Bob (200 AST for 50 DAI)',
      async () => {
        _unsignedOrder = createOrder({
          signer: {
            wallet: aliceAddress,
            token: tokenAST.address,
            amount: 50,
          },
          sender: {
            wallet: bobAddress,
            token: tokenDAI.address,
            amount: 10,
          },
          expiry: await getTimestampPlusDays(1),
        })
        _order = await signOrder(
          _unsignedOrder,
          davidSigner,
          swapContractAddress
        )
      }
    )

    it('Checks that David cannot sign an order on behalf of Alice', async () => {
      await reverted(swap(_order, { from: bobAddress }), 'SIGNER_UNAUTHORIZED')
    })

    it('Checks that David cannot sign an order on behalf of Alice without signature', async () => {
      await reverted(
        swap(
          { ..._unsignedOrder, signature: emptySignature },
          { from: bobAddress }
        ),
        'SIGNER_UNAUTHORIZED'
      )
    })

    it('Alice attempts and fails to authorize herself to sign orders on her own behalf', async () => {
      await reverted(
        swapContract.authorizeSigner(aliceAddress, {
          from: aliceAddress,
        }),
        'SELF_AUTH_INVALID'
      )
    })

    it('Alice authorizes David to sign orders on her behalf', async () => {
      emitted(
        await swapContract.authorizeSigner(davidAddress, {
          from: aliceAddress,
        }),
        'AuthorizeSigner'
      )
    })

    it('Alice tries and fails to authorize David twice', async () => {
      notEmitted(
        await swapContract.authorizeSigner(davidAddress, {
          from: aliceAddress,
        }),
        'AuthorizeSigner'
      )
    })

    it('Alice approves Swap to spend the rest of her AST', async () => {
      emitted(
        await tokenAST.approve(swapContractAddress, 800, {
          from: aliceAddress,
        }),
        'Approval'
      )
    })

    it('David signs an order on behalf of Alice successfully taken by Bob', async () => {
      emitted(await swap(_order, { from: bobAddress }), 'Swap')
    })

    it('Alice revokes authorization from David', async () => {
      emitted(
        await swapContract.revokeSigner(davidAddress, { from: aliceAddress }),
        'RevokeSigner'
      )
    })

    it('Alice tries and fails to revoke authorization from David twice', async () => {
      notEmitted(
        await swapContract.revokeSigner(davidAddress, { from: aliceAddress }),
        'RevokeSigner'
      )
    })

    it('Checks that David can no longer sign orders on behalf of Alice', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
          },
          sender: {
            wallet: bobAddress,
          },
          expiry: await getTimestampPlusDays(1),
        }),
        davidSigner,
        swapContractAddress
      )

      await reverted(swap(order, { from: bobAddress }), 'SIGNER_UNAUTHORIZED')
    })
    it('Checks remaining balances and approvals', async () => {
      // Alice and Bob swapped 50 AST for 10 DAI. Previous balances were:
      // Alice 800 AST 50 DAI, Bob 200 AST 950 DAI
      ok(
        await balances(aliceAddress, [
          [tokenAST, 750],
          [tokenDAI, 60],
        ]),
        'Alice balances are incorrect'
      )
      ok(
        await balances(bobAddress, [
          [tokenAST, 250],
          [tokenDAI, 940],
        ]),
        'Bob balances are incorrect'
      )
      // Alice approved all her AST
      ok(
        await allowances(aliceAddress, swapContractAddress, [
          [tokenAST, 750],
          [tokenDAI, 0],
        ])
      )

      ok(
        await allowances(bobAddress, swapContractAddress, [
          [tokenAST, 0],
          [tokenDAI, 940],
        ])
      )
    })
  })

  describe('Sender Delegation (Sender-side)', async () => {
    let _order

    before('Alice creates an order for Bob (50 AST for 10 DAI)', async () => {
      _order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
            token: tokenAST.address,
            amount: 50,
          },
          sender: {
            wallet: bobAddress,
            token: tokenDAI.address,
            amount: 10,
          },
          expiry: await getTimestampPlusDays(1),
        }),
        aliceSigner,
        swapContractAddress
      )
    })

    it('Checks that Carol cannot take an order on behalf of Bob', async () => {
      await reverted(
        swap(_order, { from: carolAddress }),
        'SENDER_UNAUTHORIZED'
      )
    })

    it('Bob tries to unsuccessfully authorize himself to be an authorized sender', async () => {
      await reverted(
        swapContract.authorizeSender(bobAddress, {
          from: bobAddress,
        }),
        'SELF_AUTH_INVALID'
      )
    })

    it('Bob authorizes Carol to take orders on his behalf', async () => {
      emitted(
        await swapContract.authorizeSender(carolAddress, {
          from: bobAddress,
        }),
        'AuthorizeSender'
      )
    })

    it('Bob authorizes Carol a second time does not emit an event', async () => {
      notEmitted(
        await swapContract.authorizeSender(carolAddress, {
          from: bobAddress,
        }),
        'AuthorizeSender'
      )
    })

    it('Checks that Carol can take an order on behalf of Bob', async () => {
      emitted(await swap(_order, { from: carolAddress }), 'Swap')
    })

    it('Bob revokes sender authorization from Carol', async () => {
      emitted(
        await swapContract.revokeSender(carolAddress, { from: bobAddress }),
        'RevokeSender'
      )
    })

    it('Bob fails to revoke sender authorization from Carol a second time', async () => {
      notEmitted(
        await swapContract.revokeSender(carolAddress, { from: bobAddress }),
        'RevokeSender'
      )
    })

    it('Checks that Carol can no longer take orders on behalf of Bob', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
          },
          sender: {
            wallet: bobAddress,
          },
          expiry: await getTimestampPlusDays(1),
        }),
        aliceSigner,
        swapContractAddress
      )

      await reverted(swap(order, { from: carolAddress }), 'SENDER_UNAUTHORIZED')
    })

    it('Checks remaining balances and approvals', async () => {
      // Alice and Bob swapped 50 AST for 10 DAI again. Previous balances were:
      // Alice 750 AST 60 DAI, Bob 250 AST 940 DAI
      ok(
        await balances(aliceAddress, [
          [tokenAST, 700],
          [tokenDAI, 70],
        ]),
        'Alice balances are incorrect'
      )
      ok(
        await balances(bobAddress, [
          [tokenAST, 300],
          [tokenDAI, 930],
        ]),
        'Bob balances are incorrect'
      )
      ok(
        await allowances(aliceAddress, swapContractAddress, [
          [tokenAST, 700],
          [tokenDAI, 0],
        ])
      )
      ok(
        await allowances(bobAddress, swapContractAddress, [
          [tokenAST, 0],
          [tokenDAI, 930],
        ])
      )
    })
  })

  describe('Signer and Sender Delegation (Three Way)', async () => {
    it('Alice approves David to make orders on her behalf', async () => {
      emitted(
        await swapContract.authorizeSigner(davidAddress, {
          from: aliceAddress,
        }),
        'AuthorizeSigner'
      )
    })

    it('Bob approves David to take orders on his behalf', async () => {
      emitted(
        await swapContract.authorizeSender(davidAddress, {
          from: bobAddress,
        }),
        'AuthorizeSender'
      )
    })

    it('Alice gives an unsigned order to David who takes it for Bob', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
            token: tokenAST.address,
            amount: 25,
          },
          sender: {
            wallet: bobAddress,
            token: tokenDAI.address,
            amount: 5,
          },
          expiry: await getTimestampPlusDays(1),
        }),
        aliceSigner,
        swapContractAddress
      )

      emitted(
        await swap(order, {
          from: davidAddress,
        }),
        'Swap'
      )
    })

    it('Checks remaining balances and approvals', async () => {
      // Alice and Bob swapped 25 AST for 5 DAI. Previous balances were:
      // Alice 700 AST 70 DAI, Bob 300 AST 930 DAI
      ok(
        await balances(aliceAddress, [
          [tokenAST, 675],
          [tokenDAI, 75],
        ]),
        'Alice balances are incorrect'
      )
      ok(
        await balances(bobAddress, [
          [tokenAST, 325],
          [tokenDAI, 925],
        ]),
        'Bob balances are incorrect'
      )
      ok(
        await allowances(aliceAddress, swapContractAddress, [
          [tokenAST, 675],
          [tokenDAI, 0],
        ])
      )
      ok(
        await allowances(bobAddress, swapContractAddress, [
          [tokenAST, 0],
          [tokenDAI, 925],
        ])
      )
    })
  })

  describe('Signer and Sender Delegation (Four Way)', async () => {
    it('Bob approves Carol to take orders on his behalf', async () => {
      emitted(
        await swapContract.authorizeSender(carolAddress, {
          from: bobAddress,
        }),
        'AuthorizeSender'
      )
    })

    it('David makes an order for Alice, Carol takes the order for Bob', async () => {
      // Alice has already approved David in the previous section
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
            token: tokenAST.address,
            amount: 25,
          },
          sender: {
            wallet: bobAddress,
            token: tokenDAI.address,
            amount: 5,
          },
          expiry: await getTimestampPlusDays(1),
        }),
        davidSigner,
        swapContractAddress
      )

      emitted(await swap(order, { from: carolAddress }), 'Swap')
    })

    it('Bob revokes the authorization to Carol', async () => {
      emitted(
        await swapContract.revokeSender(carolAddress, {
          from: bobAddress,
        }),
        'RevokeSender'
      )
    })

    it('Checks remaining balances and approvals', async () => {
      // Alice and Bob swapped 25 AST for 5 DAI. Previous balances were:
      // Alice 675 AST 75 DAI, Bob 375 AST 925 DAI
      ok(
        await balances(aliceAddress, [
          [tokenAST, 650],
          [tokenDAI, 80],
        ]),
        'Alice balances are incorrect'
      )
      ok(
        await balances(bobAddress, [
          [tokenAST, 350],
          [tokenDAI, 920],
        ]),
        'Bob balances are incorrect'
      )
      ok(
        await allowances(aliceAddress, swapContractAddress, [
          [tokenAST, 650],
          [tokenDAI, 0],
        ])
      )
      ok(
        await allowances(bobAddress, swapContractAddress, [
          [tokenAST, 0],
          [tokenDAI, 920],
        ])
      )
    })
  })

  describe('Cancels', async () => {
    let _orderOne
    let _orderTwo
    let _orderThree

    before('Alice creates orders with nonces 1, 2, 3', async () => {
      _orderOne = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
          },
          nonce: 1,
          expiry: await getTimestampPlusDays(1),
        }),
        aliceSigner,
        swapContractAddress
      )

      _orderTwo = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
          },
          nonce: 2,
          expiry: await getTimestampPlusDays(1),
        }),
        aliceSigner,
        swapContractAddress
      )

      _orderThree = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
          },
          nonce: 3,
          expiry: await getTimestampPlusDays(1),
        }),
        aliceSigner,
        swapContractAddress
      )
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
        swap(_orderOne, { from: bobAddress }),
        'ORDER_TAKEN_OR_CANCELLED'
      )
    })

    it('Checks that Alice is able to set a minimum nonce of 4', async () => {
      emitted(await cancelUpTo(4, { from: aliceAddress }), 'CancelUpTo')
    })

    it('Checks that Bob is unable to take an order with nonce 2', async () => {
      await reverted(swap(_orderTwo, { from: bobAddress }), 'NONCE_TOO_LOW')
    })

    it('Checks that Bob is unable to take an order with nonce 3', async () => {
      await reverted(swap(_orderThree, { from: bobAddress }), 'NONCE_TOO_LOW')
    })

    it('Checks existing balances (Alice 650 AST and 180 DAI, Bob 350 AST and 820 DAI)', async () => {
      // No swaps happened in this section
      ok(
        await balances(aliceAddress, [
          [tokenAST, 650],
          [tokenDAI, 80],
        ]),
        'Alice balances are incorrect'
      )
      ok(
        await balances(bobAddress, [
          [tokenAST, 350],
          [tokenDAI, 920],
        ]),
        'Bob balances are incorrect'
      )
      ok(
        await allowances(aliceAddress, swapContractAddress, [
          [tokenAST, 650],
          [tokenDAI, 0],
        ])
      )
      ok(
        await allowances(bobAddress, swapContractAddress, [
          [tokenAST, 0],
          [tokenDAI, 920],
        ])
      )
    })
  })

  describe('Swaps with Fees', async () => {
    it('Checks that Carol gets paid 50 AST for facilitating a trade between Alice and Bob', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
            token: tokenAST.address,
            amount: 100,
          },
          sender: {
            wallet: bobAddress,
            token: tokenDAI.address,
            amount: 50,
          },
          affiliate: {
            wallet: carolAddress,
            token: tokenAST.address,
            amount: 50,
          },
          expiry: await getTimestampPlusDays(1),
        }),
        aliceSigner,
        swapContractAddress
      )

      emitted(await swap(order, { from: bobAddress }), 'Swap')
    })

    it('Checks balances...', async () => {
      ok(
        await balances(aliceAddress, [
          [tokenAST, 500],
          [tokenDAI, 130],
        ]),
        'Alice balances are incorrect'
      )
      ok(
        await balances(bobAddress, [
          [tokenAST, 450],
          [tokenDAI, 870],
        ]),
        'Bob balances are incorrect'
      )
      ok(
        await balances(carolAddress, [
          [tokenAST, 50],
          [tokenDAI, 0],
        ]),
        'Carol balances are incorrect'
      )
    })
  })

  describe('Swap with Public Orders (No Sender Set)', async () => {
    it('Checks that a Swap succeeds without a sender wallet set', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
            token: tokenAST.address,
            amount: 5,
          },
          sender: {
            token: tokenDAI.address,
            amount: '0',
          },
          expiry: await getTimestampPlusDays(1),
        }),
        aliceSigner,
        swapContractAddress
      )

      emitted(await swap(order, { from: bobAddress }), 'Swap')
    })
  })

  describe('Signatures', async () => {
    it('Checks that an invalid signer signature will revert', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
          },
          sender: {
            wallet: bobAddress,
          },
          expiry: await getTimestampPlusDays(1),
        }),
        eveSigner,
        swapContractAddress
      )

      order.signature.signatory = aliceAddress
      await reverted(swap(order, { from: bobAddress }), 'SIGNATURE_INVALID')
    })

    it('Alice authorizes Eve to make orders on her behalf', async () => {
      emitted(
        await swapContract.authorizeSigner(eveSigner.address, {
          from: aliceAddress,
        }),
        'AuthorizeSigner'
      )
    })

    it('Checks that an invalid delegate signature will revert', async () => {
      const orderOne = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
            token: tokenAST.address,
            amount: '0',
          },
          sender: {
            wallet: bobAddress,
            token: tokenDAI.address,
            amount: '0',
          },
          expiry: await getTimestampPlusDays(1),
        }),
        aliceSigner,
        swapContractAddress
      )

      const orderTwo = createOrder({
        signer: {
          wallet: aliceAddress,
        },
        sender: {
          wallet: bobAddress,
        },
        expiry: await getTimestampPlusDays(1),
      })

      const signatureTwo = await createSignature(
        orderTwo,
        eveSigner,
        swapContractAddress
      )

      orderOne.signature = signatureTwo
      await reverted(swap(orderOne, { from: bobAddress }), 'SIGNATURE_INVALID')
    })

    it('Checks that an invalid signature version will revert', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: aliceAddress,
          },
          sender: {
            wallet: bobAddress,
          },
          expiry: await getTimestampPlusDays(1),
        }),
        eveSigner,
        swapContractAddress
      )

      order.signature.version = Buffer.from('00', 'hex')
      await reverted(swap(order, { from: bobAddress }), 'SIGNATURE_INVALID')
    })

    it('Checks that a private key signature is valid', async () => {
      const order = await signOrder(
        createOrder({
          signer: {
            wallet: eveSigner.address,
            token: tokenAST.address,
            amount: '0',
          },
          sender: {
            wallet: aliceAddress,
            token: tokenDAI.address,
            amount: '0',
          },
          expiry: await getTimestampPlusDays(1),
        }),
        eveSigner,
        swapContractAddress
      )

      emitted(await swap(order, { from: aliceAddress }), 'Swap')
    })
    // it('Checks that a typed data (EIP712) signature is valid', async () => {
    //   const order = createOrder({
    //     signer: {
    //       wallet: eveSigner.address,
    //       token: tokenAST.address,
    //       amount: '0',
    //     },
    //     sender: {
    //       wallet: aliceAddress,
    //       token: tokenDAI.address,
    //       amount: '0',
    //     },
    //     expiry: await getTimestampPlusDays(1),
    //   })

    //   order.signature = getTypedDataSignature(
    //     order,
    //     Buffer.from(eveSigner.privateKey.slice(2), 'hex'),
    //     swapContractAddress
    //   )

    //   emitted(await swap(order, { from: aliceAddress }), 'Swap')
    // })
  })
})
