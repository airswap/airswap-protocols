const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')
const Wrapper = artifacts.require('Wrapper')
const WETH9 = artifacts.require('WETH9')
const FungibleToken = artifacts.require('FungibleToken')

const {
  emitted,
  reverted,
  equal,
  getResult,
  passes,
  ok,
} = require('@airswap/test-utils').assert
const { balances } = require('@airswap/test-utils').balances
const { takeSnapshot, revertToSnapshot } = require('@airswap/test-utils').time
const { orders, signatures } = require('@airswap/order-utils')

let swapContract
let wrapperContract

let swapAddress
let wrapperAddress

let wrappedSwap
let tokenAST
let tokenDAI
let tokenWETH
let snapshotId

contract('Wrapper', async ([aliceAddress, bobAddress, carolAddress]) => {
  before('Setup', async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
    // link types to swap
    await Swap.link(Types, (await Types.new()).address)
    // now deploy swap
    swapContract = await Swap.new()

    swapAddress = swapContract.address
    tokenWETH = await WETH9.new()
    wrapperContract = await Wrapper.new(swapAddress, tokenWETH.address)
    wrapperAddress = wrapperContract.address
    tokenDAI = await FungibleToken.new()
    tokenAST = await FungibleToken.new()

    orders.setVerifyingContract(swapAddress)
    orders.setKnownAccounts([aliceAddress, bobAddress, carolAddress])
    wrappedSwap = wrapperContract.swap
  })

  after('Cleanup', async () => {
    await revertToSnapshot(snapshotId)
  })

  describe('Setup', async () => {
    it('Mints 1000 DAI for Alice', async () => {
      let tx = await tokenDAI.mint(aliceAddress, 1000)
      ok(await balances(aliceAddress, [[tokenDAI, 1000]]))
      emitted(tx, 'Transfer')
      passes(tx)
    })

    it('Mints 1000 AST for Bob', async () => {
      let tx = await tokenAST.mint(bobAddress, 1000)
      ok(await balances(bobAddress, [[tokenAST, 1000]]))
      emitted(tx, 'Transfer')
      passes(tx)
    })
  })

  describe('Approving...', async () => {
    it('Alice approves Swap to spend 1000 DAI', async () => {
      let result = await tokenDAI.approve(swapAddress, 1000, {
        from: aliceAddress,
      })
      emitted(result, 'Approval')
    })

    it('Bob approves Swap to spend 1000 AST', async () => {
      let result = await tokenAST.approve(swapAddress, 1000, {
        from: bobAddress,
      })
      emitted(result, 'Approval')
    })

    it('Bob approves Swap to spend 1000 WETH', async () => {
      let result = await tokenWETH.approve(swapAddress, 1000, {
        from: bobAddress,
      })
      emitted(result, 'Approval')
    })
  })

  it('Bob authorizes the Wrapper to send orders on his behalf', async () => {
    let tx = await swapContract.authorizeSender(wrapperAddress, {
      from: bobAddress,
    })
    passes(tx)
    emitted(tx, 'AuthorizeSender')
  })

  describe('Wrap Buys', async () => {
    it('Checks that Bob take a WETH order from Alice using ETH', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenDAI.address,
          param: 50,
        },
        sender: {
          wallet: bobAddress,
          token: tokenWETH.address,
          param: 10,
        },
      })

      let result = await wrappedSwap(order, {
        from: bobAddress,
        value: order.sender.param,
      })
      await passes(result)
      result = await getResult(swapContract, result.tx)
      emitted(result, 'Swap')

      ok(await balances(wrapperAddress, [[tokenDAI, 0], [tokenWETH, 0]]))
      ok(await balances(aliceAddress, [[tokenWETH, 10]]))
      ok(await balances(bobAddress, [[tokenDAI, 50]]))
    })
  })

  describe('Unwrap Sells', async () => {
    it('Carol gets some WETH and approves on the Swap contract', async () => {
      let tx = await tokenWETH.deposit({ from: carolAddress, value: 10000 })
      passes(tx)
      emitted(tx, 'Deposit')
      tx = await tokenWETH.approve(swapAddress, 10000, { from: carolAddress })
      passes(tx)
      emitted(tx, 'Approval')
    })

    it('Alice authorizes the Wrapper to send orders on her behalf', async () => {
      let tx = await swapContract.authorizeSender(wrapperAddress, {
        from: aliceAddress,
      })
      passes(tx)
      emitted(tx, 'AuthorizeSender')
    })

    it('Alice approves the Wrapper contract to move her WETH', async () => {
      let tx = await tokenWETH.approve(wrapperAddress, 10000, {
        from: aliceAddress,
      })
      passes(tx)
      emitted(tx, 'Approval')
    })

    it('Checks that Alice receives ETH for a WETH order from Carol', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: carolAddress,
          token: tokenWETH.address,
          param: 10000,
        },
        sender: {
          wallet: aliceAddress,
          token: tokenDAI.address,
          param: 100,
        },
      })

      let result = await wrappedSwap(order, { from: aliceAddress })
      passes(result)
      result = await getResult(swapContract, result.tx)
      emitted(result, 'Swap')

      ok(await balances(wrapperAddress, [[tokenDAI, 0], [tokenWETH, 0]]))
      ok(await balances(aliceAddress, [[tokenDAI, 850]]))
    })
  })

  describe('Sending ether and WETH to the WrapperContract without swap issues', async () => {
    it('Sending ether to the Wrapper Contract', async () => {
      await reverted(
        web3.eth.sendTransaction({
          to: wrapperAddress,
          from: aliceAddress,
          value: 100000,
          data: '0x0',
        }),
        'DO_NOT_SEND_ETHER'
      )

      equal(await web3.eth.getBalance(wrapperAddress), 0)
    })
    it('Sending WETH to the Wrapper Contract', async () => {
      const startingBalance = await tokenWETH.balanceOf(wrapperAddress)
      await tokenWETH.transfer(wrapperAddress, 5, { from: aliceAddress })
      ok(
        await balances(wrapperAddress, [
          [tokenWETH, startingBalance.toNumber() + 5],
        ])
      )
    })

    it('Alice approves Swap to spend 1000 DAI', async () => {
      let result = await tokenDAI.approve(swapAddress, 1000, {
        from: aliceAddress,
      })
      emitted(result, 'Approval')
    })

    it('Send order where the sender does not send the correct amount of ETH', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenDAI.address,
          param: 1,
        },
        sender: {
          wallet: bobAddress,
          token: tokenWETH.address,
          param: 100,
        },
      })
      await reverted(
        wrappedSwap(order, {
          from: bobAddress,
          value: 200,
        }),
        'VALUE_MUST_BE_SENT'
      )
    })

    it('Send order where Bob sends Eth to Alice for DAI', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenDAI.address,
          param: 50,
        },
        sender: {
          wallet: bobAddress,
          token: tokenWETH.address,
          param: 10,
        },
      })
      let result = await wrappedSwap(order, {
        from: bobAddress,
        value: order.sender.param,
      })
      await passes(result)
      result = await getResult(swapContract, result.tx)
      emitted(result, 'Swap')
      equal(await web3.eth.getBalance(wrapperAddress), 0)
      ok(await balances(wrapperAddress, [[tokenDAI, 0], [tokenWETH, 5]]))
    })
  })

  describe('Sending nonWETH ERC20', async () => {
    it('Alice approves Swap to spend 1000 DAI', async () => {
      let result = await tokenDAI.approve(swapAddress, 1000, {
        from: aliceAddress,
      })
      emitted(result, 'Approval')
    })

    it('Bob approves Swap to spend 1000 AST', async () => {
      let result = await tokenAST.approve(swapAddress, 1000, {
        from: bobAddress,
      })
      emitted(result, 'Approval')
    })

    it('Bob authorizes the Wrapper to send orders on her behalf', async () => {
      let tx = await swapContract.authorizeSender(wrapperAddress, {
        from: bobAddress,
      })
      passes(tx)
      emitted(tx, 'AuthorizeSender')
    })

    it('Send order where Bob sends AST to Alice for DAI', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenDAI.address,
          param: 1,
        },
        sender: {
          wallet: bobAddress,
          token: tokenAST.address,
          param: 100,
        },
      })
      let result = await wrappedSwap(order, {
        from: bobAddress,
        value: 0,
      })
      await passes(result)
      result = await getResult(swapContract, result.tx)
      emitted(result, 'Swap')
      equal(await web3.eth.getBalance(wrapperAddress), 0)
      ok(
        await balances(wrapperAddress, [
          [tokenAST, 0],
          [tokenDAI, 0],
          [tokenWETH, 5],
        ])
      )
    })

    it('Send order where the sender is not the sender of the order', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenDAI.address,
          param: 1,
        },
        sender: {
          wallet: bobAddress,
          token: tokenAST.address,
          param: 100,
        },
      })
      await reverted(
        wrappedSwap(order, {
          from: carolAddress,
          value: 0,
        }),
        'MSG_SENDER_MUST_BE_ORDER_SENDER'
      )
    })

    it('Send order without WETH where ETH is incorrectly supplied', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: aliceAddress,
          token: tokenDAI.address,
          param: 1,
        },
        sender: {
          wallet: bobAddress,
          token: tokenAST.address,
          param: 100,
        },
      })
      await reverted(
        wrappedSwap(order, {
          from: bobAddress,
          value: 10,
        }),
        'VALUE_MUST_BE_ZERO'
      )
    })

    it('Send order where Bob sends AST to Alice for DAI w/ authorization but without signature', async () => {
      const order = await orders.getOrder(
        {
          signer: {
            wallet: aliceAddress,
            token: tokenDAI.address,
            param: 1,
          },
          sender: {
            wallet: bobAddress,
            token: tokenAST.address,
            param: 100,
          },
        },
        true
      )

      order.signature = signatures.getEmptySignature()

      let result = wrappedSwap(order, {
        from: bobAddress,
        value: 0,
      })
      await reverted(result, 'SIGNATURE_MUST_BE_SENT.')
    })
  })
})
