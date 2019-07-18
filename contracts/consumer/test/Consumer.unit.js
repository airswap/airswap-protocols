const Consumer = artifacts.require('Consumer')
const Swap = artifacts.require('Swap')
const Indexer = artifacts.require('Indexer')
const Delegate = artifacts.require('Delegate')
const MockContract = artifacts.require("MockContract")
const abi = require('ethereumjs-abi')
const { emitted, equal, ok } = require('@airswap/test-utils').assert
const { balances } = require('@airswap/test-utils').balances
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { intents } = require('@airswap/indexer-utils')

const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';

contract.only('Consumer Unit Tests', async (accounts) => {
  
    let snapshotId
    let mockSwap
    let mockIndexer
    let consumer

    beforeEach(async() => {
      let snapShot = await takeSnapshot()
      snapshotId = snapShot['result']
    });

    afterEach(async() => {
      await revertToSnapShot(snapshotId)
    });

    before('deploy Consumer', async () => {
      let swapTemplate = await Swap.new()
      mockSwap = await MockContract.new()

      let indexerTemplate = await Indexer.new(EMPTY_ADDRESS, 0)
      mockIndexer = await MockContract.new()

      let delegateTemplate = await Delegate.new(EMPTY_ADDRESS)
      mockDelegate = await MockContract.new()

      consumer = await Consumer.new(mockSwap.address, mockIndexer.address)

      let delegate_getBuyQuote = delegateTemplate.contract.methods.getBuyQuote(0, EMPTY_ADDRESS, EMPTY_ADDRESS).encodeABI()
      mockDelegate.givenMethodReturnUint(delegate_getBuyQuote, 400)

      let indexer_getIntents = indexerTemplate.contract.methods.getIntents(EMPTY_ADDRESS, EMPTY_ADDRESS, 0).encodeABI()
      mockIndexer.givenMethodReturn(
        indexer_getIntents,
        abi.rawEncode(['bytes32[]'], [ [mockDelegate.address, mockDelegate.address] ])
      )
    })

    describe("Test initial values", async () => {
      it("Test initial Swap Contact", async () => {
        let val = await consumer.swapContract.call();
        equal(val,  mockSwap.address, "swap address is incorrect");
      })

      it("Test initial Indexer Contact", async () => {
        let val = await consumer.indexerContract.call();
        equal(val,  mockIndexer.address, "indexer address is incorrect");
      })
    })

    describe("Test findBestBuy()", async () => {
    });
  }
 )
