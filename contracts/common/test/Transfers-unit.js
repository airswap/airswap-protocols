const Transfers = artifacts.require('../libraries/Transfers')
const MockTransfers = artifacts.require('MockTransfers')
const FungibleToken = artifacts.require('FungibleToken') // ERC20 Token
const NonFungibleToken = artifacts.require('NonFungibleToken') // ERC721 Token
const BigNumber = require('bignumber.js')
const {
  equal,
  notEqual,
  passes,
  emitted,
  reverted,
} = require('@airswap/test-utils').assert
const {
  defaults,
  EMPTY_ADDRESS,
} = require('@airswap/order-utils').constants
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time

contract('Transfers Unit Tests', async accounts => {
  const sender = accounts[1]
  const receiver = accounts[2]
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
  /*
  describe('Test transferAny', async () => {
    it('Test transferAny ERC20 ', async () => {
      await mockTransfers.transferAny(DELEGATE_TOKEN, owner, notOwner, MAX_DELEGATE_AMOUNT)
    })

    it('Test transferAny ERC721', async () => {
      await mockTransfers.transferAny(DELEGATE_TOKEN, owner, notOwner, MAX_DELEGATE_AMOUNT)
    })

    it('Test transferAny for EOA - Fail ', async () => {
      await mockTransfers.transferAny(DELEGATE_TOKEN, owner, notOwner, MAX_DELEGATE_AMOUNT)
    })
  })*/

  /*  describe('Test safeTransferAny', async () => {
    it('Test transferAny ERC20 ', async () => {
      await mockTransfers.transferAny(DELEGATE_TOKEN, owner, notOwner, MAX_DELEGATE_AMOUNT)
    })

    it('Test transferAny ERC721', async () => {
      await mockTransfers.transferAny(DELEGATE_TOKEN, owner, notOwner, MAX_DELEGATE_AMOUNT)
    })

    it('Test transferAny for EOA - Fail ', async () => {
      await mockTransfers.transferAny(DELEGATE_TOKEN, owner, notOwner, MAX_DELEGATE_AMOUNT)
    })
  })*/
})
