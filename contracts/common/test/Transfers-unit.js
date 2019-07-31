const Transfers = artifacts.require('../libraries/Transfers')
const MockTransfers = artifacts.require('MockTransfers')
const FungibleToken = artifacts.require('FungibleToken') // ERC20 Token
const NonFungibleToken = artifacts.require('NonFungibleToken') // ERC721 Token
const MockContract = artifacts.require('MockContract')
const BigNumber = require('bignumber.js')
const {
  equal,
  notEqual,
  passes,
  emitted,
  reverted,
} = require('@airswap/test-utils').assert
const { defaults, EMPTY_ADDRESS } = require('@airswap/order-utils').constants
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time

contract('Transfers Unit Tests', async accounts => {
  const sender = accounts[1]
  const receiver = accounts[2]
  const TAKER = web3.utils.fromAscii('TAKER')
  let mockTransfers
  const etherAmount = web3.utils.toWei('1', 'ether')

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  before('deploy Transfers', async () => {
    const transfersLib = await Transfers.new()
    await MockTransfers.link('Transfers', transfersLib.address)
    mockTransfers = await MockTransfers.new()
  })

  describe('Test send', async () => {
    it('Test sending', async () => {
      let senderBalance = await web3.eth.getBalance(sender)
      let receiverBalance = await web3.eth.getBalance(receiver)
      await passes(
        mockTransfers.send(receiver, etherAmount, {
          from: sender,
          value: etherAmount,
        })
      )
      newSenderBalance = await web3.eth.getBalance(sender)
      newReceiverBalance = await web3.eth.getBalance(receiver)
      equal(newReceiverBalance, BigNumber(receiverBalance).plus(etherAmount))
    })
  })

  describe('Test transferAny', async () => {
    it('Test transferAny ERC20 ', async () => {
      let fungibleTokenTemplate = await FungibleToken.new()
      mockFungibleToken = await MockContract.new()

      let delegate_transferFrom = fungibleTokenTemplate.contract.methods
        .transferFrom(sender, receiver, 1000)
        .encodeABI()
      await mockFungibleToken.givenMethodReturnBool(delegate_transferFrom, true)

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
        delegate_transferFrom
      )
      equal(invocationCount, 1, 'FungibleToken.transferFrom was called once')
    })

    it('Test transferAny ERC721', async () => {
      let nonFungibleTokenTemplate = await NonFungibleToken.new()
      mockNonFungibleToken = await MockContract.new()

      let delegate_support165 = nonFungibleTokenTemplate.contract.methods
        .supportsInterface('0x01ffc9a7')
        .encodeABI()
      await mockNonFungibleToken.givenCalldataReturnBool(
        delegate_support165,
        true
      )
      let delegate_support721 = nonFungibleTokenTemplate.contract.methods
        .supportsInterface('0x80ac58cd')
        .encodeABI()
      await mockNonFungibleToken.givenCalldataReturnBool(
        delegate_support721,
        true
      )
      let delegate_supportfff = nonFungibleTokenTemplate.contract.methods
        .supportsInterface('0xffffffff')
        .encodeABI()
      await mockNonFungibleToken.givenCalldataReturnBool(
        delegate_supportfff,
        false
      )

      let delegate_safeTransferFrom = nonFungibleTokenTemplate.contract.methods
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
        delegate_safeTransferFrom
      )
      equal(
        invocationCount,
        1,
        'NonFungibleToken.safetransferFrom was called once'
      )
    })

    /*it('Test transferAny for EOA - Fail ', async () => {
      await mockTransfers.transferAny(mockNonFungibleToken.address, sender, receiver, 1000)
    })*/
  })

  describe('Test safeTransferAny', async () => {
    it('Test safeTransferAny ERC20 - Fails Invalid Destination', async () => {
      let fungibleTokenTemplate = await FungibleToken.new()
      mockFungibleToken = await MockContract.new()

      let delegate_transferFrom = fungibleTokenTemplate.contract.methods
        .transferFrom(sender, receiver, 1000)
        .encodeABI()
      await mockFungibleToken.givenMethodReturnBool(delegate_transferFrom, true)

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
      let fungibleTokenTemplate = await FungibleToken.new()
      mockFungibleToken = await MockContract.new()

      let delegate_balanceOf = fungibleTokenTemplate.contract.methods
        .balanceOf(sender)
        .encodeABI()
      await mockFungibleToken.givenMethodReturnUint(delegate_balanceOf, 10000)

      let delegate_allowance = fungibleTokenTemplate.contract.methods
        .allowance(sender, sender)
        .encodeABI()
      await mockFungibleToken.givenMethodReturnUint(delegate_allowance, 0)

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
      let nonFungibleTokenTemplate = await NonFungibleToken.new()
      mockNonFungibleToken = await MockContract.new()

      let delegate_support165 = nonFungibleTokenTemplate.contract.methods
        .supportsInterface('0x01ffc9a7')
        .encodeABI()
      await mockNonFungibleToken.givenCalldataReturnBool(
        delegate_support165,
        true
      )
      let delegate_support721 = nonFungibleTokenTemplate.contract.methods
        .supportsInterface('0x80ac58cd')
        .encodeABI()
      await mockNonFungibleToken.givenCalldataReturnBool(
        delegate_support721,
        true
      )
      let delegate_supportfff = nonFungibleTokenTemplate.contract.methods
        .supportsInterface('0xffffffff')
        .encodeABI()
      await mockNonFungibleToken.givenCalldataReturnBool(
        delegate_supportfff,
        false
      )

      let delegate_safeTransferFrom = nonFungibleTokenTemplate.contract.methods
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
        delegate_safeTransferFrom
      )
      equal(
        invocationCount,
        1,
        'NonFungibleToken.safetransferFrom was called once'
      )
    })
  })
})
