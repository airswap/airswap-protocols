const Swap = artifacts.require('Swap')
const Wrapper = artifacts.require('Wrapper')
const WETH9 = artifacts.require('WETH9')
const FungibleToken = artifacts.require('FungibleToken')

const { emitted, getResult } = require('@airswap/test-utils').assert
const { getTimestampPlusDays } = require('@airswap/test-utils').time
const { orders, signatures } = require('@airswap/order-utils')

let swapContract
let wrapperContract

let swapAddress
let wrapperAddress

let swap
let swapSimple

contract('Wrapper', ([aliceAddress, bobAddress, carolAddress]) => {
  orders.setKnownAccounts([aliceAddress, bobAddress, carolAddress])

  describe('Setup', () => {
    before('Deploys all the things', async () => {
      swapContract = await Swap.deployed()
      swapAddress = swapContract.address
      wrapperContract = await Wrapper.deployed()
      wrapperAddress = wrapperContract.address
      tokenWETH = await WETH9.deployed()
      tokenDAI = await FungibleToken.new()

      orders.setVerifyingContract(swapAddress)

      swap =
        swapContract.methods[
          'swap((uint256,uint256,(address,address,uint256),(address,address,uint256),(address,address,uint256)),(address,uint8,bytes32,bytes32,bytes1))'
        ]
      swapSimple =
        wrapperContract.methods[
          'swapSimple(uint256,uint256,address,uint256,address,address,uint256,address,uint8,bytes32,bytes32)'
        ]
    })
    it('Mints 1000 DAI for Alice', async () => {
      let tx = await tokenDAI.mint(aliceAddress, 1000)
      emitted(tx, 'Transfer')
    })
  })

  describe('Approving...', () => {
    it('Alice approves Swap to spend 9999 DAI', async () => {
      let tx = await tokenDAI.approve(swapAddress, 9999, { from: aliceAddress })
      emitted(tx, 'Approval')
    })
  })

  describe('Wrap Buys', () => {
    it('Checks that Bob take a WETH order from Alice using ETH', async () => {
      const { order } = await orders.getOrder({
        maker: {
          wallet: aliceAddress,
          token: tokenDAI.address,
          param: 50,
        },
        taker: {
          token: tokenWETH.address,
          param: 10,
        },
      })
      const signature = await signatures.getSimpleSignature(
        order,
        aliceAddress,
        swapAddress
      )

      let result = await swapSimple(
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
        { from: bobAddress, value: order.taker.param }
      )

      result = await getResult(swapContract, result.tx)
      emitted(result, 'Swap')
    })
  })

  describe('Unwrap Sells', async () => {
    it('Carol gets some WETH and approves on the Swap contract', async () => {
      let tx = await tokenWETH.deposit({ from: carolAddress, value: 10000 })
      emitted(tx, 'Deposit')
      tx = await tokenWETH.approve(swapAddress, 10000, { from: carolAddress })
      emitted(tx, 'Approval')
    })

    it('Alice authorizes the Wrapper to send orders on her behalf', async () => {
      let expiry = await getTimestampPlusDays(1)
      let tx = await swapContract.authorize(wrapperAddress, expiry, {
        from: aliceAddress,
      })
      emitted(tx, 'Authorize')
    })

    it('Alice authorizes the Swap contract to move her WETH', async () => {
      let tx = await tokenWETH.approve(wrapperAddress, 10000, {
        from: aliceAddress,
      })
      emitted(tx, 'Approval')
    })

    it('Checks that Alice receives ETH for a WETH order from Carol', async () => {
      const { order } = await orders.getOrder({
        maker: {
          wallet: carolAddress,
          token: tokenWETH.address,
          param: 10000,
        },
        taker: {
          wallet: aliceAddress,
          token: tokenDAI.address,
          param: 100,
        },
      })
      const signature = await signatures.getSimpleSignature(
        order,
        carolAddress,
        swapAddress
      )

      let result = await swapSimple(
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
        { from: aliceAddress }
      )
      result = await getResult(swapContract, result.tx)
      emitted(result, 'Swap')
    })
  })
})
