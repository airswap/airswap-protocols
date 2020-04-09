const DelegateV2 = artifacts.require('DelegateV2')
const Swap = artifacts.require('Swap')
const Types = artifacts.require('Types')
const TransferHandlerRegistry = artifacts.require('TransferHandlerRegistry')
const ERC20TransferHandler = artifacts.require('ERC20TransferHandler')
const Indexer = artifacts.require('Indexer')
const FungibleToken = artifacts.require('FungibleToken')

const ethers = require('ethers')
const { tokenKinds, ADDRESS_ZERO } = require('@airswap/constants')
const { emptySignature } = require('@airswap/types')
const { createOrder, signOrder } = require('@airswap/utils')
const { equal, emitted, reverted } = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapshot } = require('@airswap/test-utils').time
const { GANACHE_PROVIDER } = require('@airswap/test-utils').constants

contract('Delegate Integration Tests', async accounts => {
  const STARTING_BALANCE = 100000000
  const aliceAddress = accounts[1]
  const bobAddress = accounts[2]
  const carolAddress = accounts[3]
  const aliceTradeWallet = accounts[4]
  const bobSigner = new ethers.providers.JsonRpcProvider(
    GANACHE_PROVIDER
  ).getSigner(bobAddress)
  const PROTOCOL = '0x0002'
  let stakingToken
  let tokenDAI
  let tokenWETH
  let aliceDelegate
  let swap
  let swapAddress
  let indexer

  async function setupTokens() {
    tokenWETH = await FungibleToken.new()
    tokenDAI = await FungibleToken.new()
    stakingToken = await FungibleToken.new()

    await tokenWETH.mint(aliceTradeWallet, STARTING_BALANCE)
    await tokenDAI.mint(aliceTradeWallet, STARTING_BALANCE)
    await stakingToken.mint(aliceAddress, STARTING_BALANCE)
  }

  async function setupIndexer() {
    indexer = await Indexer.new(stakingToken.address)
    await indexer.createIndex(tokenDAI.address, tokenWETH.address, PROTOCOL)
  }

  async function setupSwap() {
    const types = await Types.new()
    await Swap.link('Types', types.address)

    const transferHandlerRegistry = await TransferHandlerRegistry.new()
    const erc20TransferHandler = await ERC20TransferHandler.new()
    await transferHandlerRegistry.addTransferHandler(
      tokenKinds.ERC20,
      erc20TransferHandler.address
    )

    swap = await Swap.new(transferHandlerRegistry.address)
    swapAddress = swap.address
  }

  before('Setup', async () => {
    await setupTokens()
    await setupIndexer()
    await setupSwap()

    aliceDelegate = await DelegateV2.new(
      swapAddress,
      indexer.address,
      aliceAddress,
      aliceTradeWallet,
      PROTOCOL
    )
  })

  describe('Test constructor', async () => {
    it('should set the swap contract address', async () => {
      const val = await aliceDelegate.swapContract.call()
      equal(val, swapAddress, 'swap address is incorrect')
    })
  })
})
