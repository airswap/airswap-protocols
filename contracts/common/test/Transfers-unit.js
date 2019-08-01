/* global artifacts, contract, web3 */
const Transfers = artifacts.require('../libraries/Transfers')
const MockTransfers = artifacts.require('MockTransfers')
const FungibleToken = artifacts.require('FungibleToken') // ERC20 Token
const NonFungibleToken = artifacts.require('NonFungibleToken') // ERC721 Token
const MockContract = artifacts.require('MockContract')
const BigNumber = require('bignumber.js')
const { equal, passes, reverted } = require('@airswap/test-utils').assert
const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time

contract('Transfers Unit Tests', async accounts => {
  const sender = accounts[1]
  const receiver = accounts[2]
  const TAKER = web3.utils.fromAscii('TAKER')
  let mockTransfers
  let mockFungibleToken
  let fungibleTokenTemplate
  let nonFungibleTokenTemplate
  let mockNonFungibleToken
  const etherAmount = web3.utils.toWei('1', 'ether')
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
        mockTransfers.send(receiver, etherAmount, {
          from: sender,
          value: etherAmount,
        })
      )
      let newReceiverBalance = await web3.eth.getBalance(receiver)
      equal(newReceiverBalance, BigNumber(receiverBalance).plus(etherAmount), 'Ether in the transfer is missing.')
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
        mockFungibleToken.address,
        sender,
        receiver,
        10000,
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
      let nft_support165 = nonFungibleTokenTemplate.contract.methods
        .supportsInterface('0x01ffc9a7')
        .encodeABI()
      await mockNonFungibleToken.givenCalldataReturnBool(nft_support165, true)
      let nft_support721 = nonFungibleTokenTemplate.contract.methods
        .supportsInterface('0x80ac58cd')
        .encodeABI()
      await mockNonFungibleToken.givenCalldataReturnBool(nft_support721, true)
      let nft_supportfff = nonFungibleTokenTemplate.contract.methods
        .supportsInterface('0xffffffff')
        .encodeABI()
      await mockNonFungibleToken.givenCalldataReturnBool(nft_supportfff, false)

      let nft_safeTransferFrom = nonFungibleTokenTemplate.contract.methods
        .safeTransferFrom(sender, receiver, 1000)
        .encodeABI()

      await passes(
        mockTransfers.transferAny(
          mockNonFungibleToken.address,
          sender,
          receiver,
          1000
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

  describe('Test safeTransferAny', async () => {
    it('Test safeTransferAny ERC20 - Fails Invalid Destination', async () => {
      let fungibleToken_transferFrom = fungibleTokenTemplate.contract.methods
        .transferFrom(sender, receiver, 1000)
        .encodeABI()
      await mockFungibleToken.givenMethodReturnBool(
        fungibleToken_transferFrom,
        true
      )

      await reverted(
        mockTransfers.safeTransferAny(
          TAKER,
          sender,
          EMPTY_ADDRESS,
          10000,
          mockFungibleToken.address,
          {
            from: sender,
          }
        ),
        'INVALID_DESTINATION'
      )
    })

    it('Test safeTransferAny ERC20 - Fails Insufficient Balance', async () => {
      let fungibleToken_balanceOf = fungibleTokenTemplate.contract.methods
        .balanceOf(sender)
        .encodeABI()
      await mockFungibleToken.givenMethodReturnUint(
        fungibleToken_balanceOf,
        10000
      )

      let fungibleToken_allowance = fungibleTokenTemplate.contract.methods
        .allowance(sender, sender)
        .encodeABI()
      await mockFungibleToken.givenMethodReturnUint(fungibleToken_allowance, 0)

      await reverted(
        mockTransfers.safeTransferAny(
          TAKER,
          sender,
          receiver,
          10000,
          mockFungibleToken.address,
          {
            from: sender,
          }
        ),
        'TAKER_INSUFFICIENT_ALLOWANCE.'
      )
    })

    it('Test safeTransferAny ERC721 to EMPTY_ADDRESS succeeds', async () => {
      let nft_support165 = nonFungibleTokenTemplate.contract.methods
        .supportsInterface('0x01ffc9a7')
        .encodeABI()
      await mockNonFungibleToken.givenCalldataReturnBool(nft_support165, true)
      let nft_support721 = nonFungibleTokenTemplate.contract.methods
        .supportsInterface('0x80ac58cd')
        .encodeABI()
      await mockNonFungibleToken.givenCalldataReturnBool(nft_support721, true)
      let nft_supportfff = nonFungibleTokenTemplate.contract.methods
        .supportsInterface('0xffffffff')
        .encodeABI()
      await mockNonFungibleToken.givenCalldataReturnBool(nft_supportfff, false)

      let nft_safeTransferFrom = nonFungibleTokenTemplate.contract.methods
        .safeTransferFrom(sender, receiver, 1000)
        .encodeABI()

      await passes(
        mockTransfers.safeTransferAny(
          TAKER,
          sender,
          EMPTY_ADDRESS,
          1000,
          mockNonFungibleToken.address
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
})
