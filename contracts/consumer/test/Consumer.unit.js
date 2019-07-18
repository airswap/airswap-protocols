const Consumer = artifacts.require('Consumer')
const Indexer = artifacts.require('Indexer')
const Delegate = artifacts.require('Delegate')
const MockContract = artifacts.require("MockContract")
const abi = require('ethereumjs-abi')
const { equal, passes } = require('@airswap/test-utils').assert
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time

const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';

contract('Consumer Unit Tests', async (accounts) => {
    const highVal = 400
    const lowVal = 200
  
    let snapshotId
    let mockSwap
    let mockIndexer
    let consumer
    let mockUserSendToken 
    let mockUserReceiveToken 

    beforeEach(async() => {
      let snapShot = await takeSnapshot()
      snapshotId = snapShot['result']
    });

    afterEach(async() => {
      await revertToSnapShot(snapshotId)
    });

    async function setupMockDelgate() {
      let delegateTemplate = await Delegate.new(EMPTY_ADDRESS)
      mockDelegateHigh = await MockContract.new()
      mockDelegateLow = await MockContract.new()

      //mock delegate getBuyQuote()
      let delegate_getBuyQuote = delegateTemplate.contract.methods.getBuyQuote(0, EMPTY_ADDRESS, EMPTY_ADDRESS).encodeABI()
      await mockDelegateHigh.givenMethodReturnUint(delegate_getBuyQuote, highVal)
      await mockDelegateLow.givenMethodReturnUint(delegate_getBuyQuote, lowVal)

      //mock delegate provideUnsignedOrder()
      let delegate_provideUnsignedOrder 
        = delegateTemplate.contract.methods.provideUnsignedOrder(0, 0, EMPTY_ADDRESS, 0, EMPTY_ADDRESS).encodeABI()
      await mockDelegateHigh.givenMethodReturnBool(delegate_provideUnsignedOrder, true);
      await mockDelegateLow.givenMethodReturnBool(delegate_provideUnsignedOrder, true);
    }

    async function setupMockIndexer() {
      let indexerTemplate = await Indexer.new(EMPTY_ADDRESS, 0)
      mockIndexer = await MockContract.new()

      //mock indexer getIntents()
      let indexer_getIntents = indexerTemplate.contract.methods.getIntents(EMPTY_ADDRESS, EMPTY_ADDRESS, 0).encodeABI()
      await mockIndexer.givenMethodReturn(
        indexer_getIntents,
        abi.rawEncode(['bytes32[]'], [ [mockDelegateHigh.address, mockDelegateLow.address] ])
      )
    }

    async function setupMocks() {
      mockUserSendToken = await MockContract.new()
      await mockUserSendToken.givenAnyReturnBool(true);

      mockUserReceiveToken = await MockContract.new()
      await mockUserReceiveToken.givenAnyReturnBool(true);

      mockSwap = await MockContract.new()
      await mockSwap.givenAnyReturnBool(true)

      await setupMockDelgate()
      await setupMockIndexer()
    }

    before('deploy Consumer', async () => {
      await setupMocks()
      consumer = await Consumer.new(mockSwap.address, mockIndexer.address)
    })

    describe("Test initial values", async () => {
      it("Test initial Swap Contact", async () => {
        let val = await consumer.swapContract.call();
        equal(val, mockSwap.address, "swap address is incorrect");
      })

      it("Test initial Indexer Contact", async () => {
        let val = await consumer.indexerContract.call();
        equal(val, mockIndexer.address, "indexer address is incorrect");
      })
    })

    describe("Test buy methods", async () => {
      it("test findBestBuy()", async () => {
        //this should always select the lowest cost delegate available
        let val = await consumer.findBestBuy.call(180, EMPTY_ADDRESS, EMPTY_ADDRESS, 2)
        equal(val[0], mockDelegateLow.address)
        equal(val[1].toNumber(), lowVal)
      })

      it("test takeBestBuy()", async () => {
        let trx = await consumer.takeBestBuy(180, mockUserSendToken.address, mockUserReceiveToken.address, 2)
        passes(trx)
      })
    });
  }
 )
