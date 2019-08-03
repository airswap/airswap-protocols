const Transfers = artifacts.require('../contracts/Transfers')
const MockTransfers = artifacts.require('MockTransfers')
const FungibleToken = artifacts.require('FungibleToken') // ERC20 Token
const NonFungibleToken = artifacts.require('NonFungibleToken') // ERC721 Token
const MockContract = artifacts.require('MockContract')
const BigNumber = require('bignumber.js')
const { equal, passes } = require('@airswap/test-utils').assert
const {
  ONE_ETH,
  INTERFACE_ERC721,
  INTERFACE_DEFAULT,
} = require('@airswap/order-utils').constants
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time

contract('Transfers Unit Tests', async accounts => {
  const sender = accounts[1]
  const receiver = accounts[2]
  let mockTransfers
  let mockFungibleToken
  let fungibleTokenTemplate
  let nonFungibleTokenTemplate
  let mockNonFungibleToken
  let snapshotId

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  before(
    'deploy Transfers, mocked Fungible, and mocked nonFungible',
    async () => {
      const transfersLib = await Transfers.new()
      await MockTransfers.link('Transfers', transfersLib.address)
      mockTransfers = await MockTransfers.new()
      fungibleTokenTemplate = await FungibleToken.new()
      mockFungibleToken = await MockContract.new()
      nonFungibleTokenTemplate = await NonFungibleToken.new()
      mockNonFungibleToken = await MockContract.new()
    }
  )

  describe('Test send function which sends Ether', async () => {
    it('Test sending 1 ether from sender to receiver', async () => {
      let receiverBalance = await web3.eth.getBalance(receiver)
      await passes(
        mockTransfers.send(receiver, ONE_ETH, {
          from: sender,
          value: ONE_ETH,
        })
      )
      let newReceiverBalance = await web3.eth.getBalance(receiver)
      equal(
        newReceiverBalance,
        BigNumber(receiverBalance).plus(ONE_ETH),
        'Ether in the transfer is missing.'
      )
    })
  })

  describe('Test transferAny', async () => {
    it('Test transferAny ERC20 ', async () => {
      let fungibleToken_transferFrom = fungibleTokenTemplate.contract.methods
        .transferFrom(sender, receiver, 1000)
        .encodeABI()
      await mockFungibleToken.givenMethodReturnBool(
        fungibleToken_transferFrom,
        true
      )

      await mockTransfers.transferAny(
        sender,
        receiver,
        10000,
        mockFungibleToken.address,
        INTERFACE_DEFAULT,
        {
          from: sender,
        }
      )

      let invocationCount = await mockFungibleToken.invocationCountForMethod.call(
        fungibleToken_transferFrom
      )
      equal(invocationCount, 1, 'FungibleToken.transferFrom was not called.')
    })

    it('Test transferAny ERC721', async () => {
      let nft_safeTransferFrom = nonFungibleTokenTemplate.contract.methods
        .safeTransferFrom(sender, receiver, 1000)
        .encodeABI()

      await passes(
        mockTransfers.transferAny(
          sender,
          receiver,
          1000,
          mockNonFungibleToken.address,
          INTERFACE_ERC721
        )
      )

      let invocationCount = await mockNonFungibleToken.invocationCountForMethod.call(
        nft_safeTransferFrom
      )
      equal(
        invocationCount,
        1,
        'NonFungibleToken.safetransferFrom was not called.'
      )
    })
  })

  describe('Test transferFungible', async () => {
    it('Test transferFungible ', async () => {
      let fungibleToken_transferFrom = fungibleTokenTemplate.contract.methods
        .transferFrom(sender, receiver, 1000)
        .encodeABI()
      await mockFungibleToken.givenMethodReturnBool(
        fungibleToken_transferFrom,
        true
      )

      await mockTransfers.transferFungible(
        sender,
        receiver,
        10000,
        mockFungibleToken.address,
        {
          from: sender,
        }
      )

      let invocationCount = await mockFungibleToken.invocationCountForMethod.call(
        fungibleToken_transferFrom
      )
      equal(invocationCount, 1, 'FungibleToken.transferFrom was not called.')
    })
  })
})
