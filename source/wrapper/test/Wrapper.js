const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')
const Wrapper = artifacts.require('Wrapper')
const Delegate = artifacts.require('Delegate')
const Indexer = artifacts.require('Indexer')
const HelperMock = artifacts.require('HelperMock')
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
const { orders, signatures } = require('@airswap/order-utils')
const { GANACHE_PROVIDER } = require('@airswap/order-utils').constants

let swapContract
let wrapperContract
let helperMockContract

let swapAddress
let wrapperAddress
let helperMockAddress

let wrappedSwap
let tokenAST
let tokenDAI
let tokenWETH

let delegate
let indexer

contract('Wrapper', async accounts => {
  const aliceAddress = accounts[0]
  const bobAddress = accounts[1]
  const carolAddress = accounts[2]
  const delegateOwner = accounts[3]

  before('Setup', async () => {
    // link types to swap
    await Swap.link('Types', (await Types.new()).address)
    // now deploy swap
    swapContract = await Swap.new()

    swapAddress = swapContract.address
    tokenWETH = await WETH9.new()
    wrapperContract = await Wrapper.new(swapAddress, tokenWETH.address)
    wrapperAddress = wrapperContract.address

    helperMockContract = await HelperMock.new(wrapperAddress)
    helperMockAddress = helperMockContract.address

    tokenDAI = await FungibleToken.new()
    tokenAST = await FungibleToken.new()

    indexer = await Indexer.new(tokenAST.address)
    delegate = await Delegate.new(
      swapAddress,
      indexer.address,
      delegateOwner,
      delegateOwner
    )

    orders.setVerifyingContract(swapAddress)
    wrappedSwap = wrapperContract.swap
  })

  describe('Setup', async () => {
    it('Mints 1000 DAI for Alice', async () => {
      const tx = await tokenDAI.mint(aliceAddress, 1000)
      ok(await balances(aliceAddress, [[tokenDAI, 1000]]))
      emitted(tx, 'Transfer')
      passes(tx)
    })

    it('Mints 1000 AST for Bob', async () => {
      const tx = await tokenAST.mint(bobAddress, 1000)
      ok(await balances(bobAddress, [[tokenAST, 1000]]))
      emitted(tx, 'Transfer')
      passes(tx)
    })
  })

  describe('Approving...', async () => {
    it('Alice approves Swap to spend 1000 DAI', async () => {
      const result = await tokenDAI.approve(swapAddress, 1000, {
        from: aliceAddress,
      })
      emitted(result, 'Approval')
    })

    it('Bob approves Swap to spend 1000 AST', async () => {
      const result = await tokenAST.approve(swapAddress, 1000, {
        from: bobAddress,
      })
      emitted(result, 'Approval')
    })

    it('Bob approves Swap to spend 1000 WETH', async () => {
      const result = await tokenWETH.approve(swapAddress, 1000, {
        from: bobAddress,
      })
      emitted(result, 'Approval')
    })

    it('Bob authorizes the Wrapper to send orders on his behalf', async () => {
      const tx = await swapContract.authorizeSender(wrapperAddress, {
        from: bobAddress,
      })
      passes(tx)
      emitted(tx, 'AuthorizeSender')
    })
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

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

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
      const tx = await swapContract.authorizeSender(wrapperAddress, {
        from: aliceAddress,
      })
      passes(tx)
      emitted(tx, 'AuthorizeSender')
    })

    it('Alice approves the Wrapper contract to move her WETH', async () => {
      const tx = await tokenWETH.approve(wrapperAddress, 10000, {
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

      order.signature = await signatures.getWeb3Signature(
        order,
        carolAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

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
      const result = await tokenDAI.approve(swapAddress, 1000, {
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

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

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

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

      let result = await wrappedSwap(order, {
        from: bobAddress,
        value: order.sender.param,
      })
      await passes(result)
      result = await getResult(swapContract, result.tx)
      emitted(result, 'Swap')
      equal(await web3.eth.getBalance(wrapperAddress), 0)

      // Wrapper has 5 weth from test:
      // Sending WETH to the Wrapper Contract
      ok(await balances(wrapperAddress, [[tokenDAI, 0], [tokenWETH, 5]]))
    })

    it('Reverts if the unwrapped ETH is sent to a non-payable contract', async () => {
      const order = await orders.getOrder({
        signer: {
          wallet: carolAddress,
          token: tokenWETH.address,
          param: 100,
        },
        sender: {
          wallet: helperMockAddress,
          token: tokenDAI.address,
          param: 100,
        },
      })

      // mint the contract 100 DAI
      await tokenDAI.mint(helperMockAddress, 1000)
      ok(await balances(helperMockAddress, [[tokenDAI, 1000]]))

      // Carol gets some WETH and approves the swap contract
      let tx = await tokenWETH.deposit({ from: carolAddress, value: 10000 })
      passes(tx)
      emitted(tx, 'Deposit')
      tx = await tokenWETH.approve(swapAddress, 10000, { from: carolAddress })
      passes(tx)
      emitted(tx, 'Approval')

      // the helper contract authorizes wrapper to send orders for them
      await helperMockContract.authorizeWrapperToSend()

      // the helper contract authorizes the wrapper to move their WETH
      await helperMockContract.approveToken(
        tokenWETH.address,
        wrapperAddress,
        50000
      )

      // the helper contract approves swap to move DAI tokens
      await helperMockContract.approveToken(
        tokenDAI.address,
        swapAddress,
        50000
      )

      // Carol signs the order
      order.signature = await signatures.getWeb3Signature(
        order,
        carolAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

      // Carol sends the order, via the helper and it reverts
      await reverted(helperMockContract.forwardSwap(order), 'ETH_RETURN_FAILED')
    })
  })

  describe('Sending nonWETH ERC20', async () => {
    it('Alice approves Swap to spend 1000 DAI', async () => {
      const result = await tokenDAI.approve(swapAddress, 1000, {
        from: aliceAddress,
      })
      emitted(result, 'Approval')
    })

    it('Bob approves Swap to spend 1000 AST', async () => {
      const result = await tokenAST.approve(swapAddress, 1000, {
        from: bobAddress,
      })
      emitted(result, 'Approval')
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

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

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

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

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

      order.signature = await signatures.getWeb3Signature(
        order,
        aliceAddress,
        swapAddress,
        GANACHE_PROVIDER
      )

      await reverted(
        wrappedSwap(order, {
          from: bobAddress,
          value: 10,
        }),
        'VALUE_MUST_BE_ZERO'
      )
    })

    it('Send order where Bob sends AST to Alice for DAI w/ authorization but without signature', async () => {
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

      const result = wrappedSwap(order, {
        from: bobAddress,
        value: 0,
      })
      await reverted(result, 'SIGNATURE_MUST_BE_SENT.')
    })
  })
})
