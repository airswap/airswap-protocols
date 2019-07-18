const Consumer = artifacts.require('Consumer')
const Swap = artifacts.require('Swap')
const Indexer = artifacts.require('Indexer')
const Delegate = artifacts.require('Delegate')
const MockContract = artifacts.require("MockContract")

const { emitted, equal, ok } = require('@airswap/test-utils').assert
const { balances } = require('@airswap/test-utils').balances
const { takeSnapshot, revertToSnapShot } = require('@airswap/test-utils').time
const { intents } = require('@airswap/indexer-utils')

// TODO: Use token-unit for realistic token amounts.

contract('Consumer Unit Tests', async (accounts) => {
  
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
      mockSwap = await MockContract.new()
      mockIndexer = await MockContract.new()
      consumer = await Consumer.new(mockSwap.address, mockIndexer.address)
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
  }
)
