const Indexer = artifacts.require('Indexer')
const MockContract = artifacts.require('MockContract')
const FungibleToken = artifacts.require('FungibleToken')

const {
  getResult,
  emitted,
  reverted,
  equal,
  ok,
} = require('@airswap/test-utils').assert
const { balances } = require('@airswap/test-utils').balances
const { getTimestampPlusDays } = require('@airswap/test-utils').time
const { intents } = require('@airswap/indexer-utils')

const ALICE_LOC = intents.serialize(
  intents.Locators.URL,
  'https://rpc.maker-cloud.io:1123'
)

contract('Indexer Unit Tests', async accounts => {
  let owner = accounts[0]
  let alice = accounts[1]
  let bob = accounts[2]

  const MIN_STAKE_250 = 250

  let indexer
  let indexerAddress

  let stakingTokenTemplate
  let stakingTokenMock
  let stakingTokenAddress

  let token1 = accounts[8]
  let token2 = accounts[9]

  setupMockToken = async () => {
    stakingTokenTemplate = await FungibleToken.new()
    stakingTokenMock = await MockContract.new()
    stakingTokenAddress = stakingTokenMock.address
  }

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  before('Setup contracts', async () => {
    await setupMockToken()
    indexer = await Indexer.new(stakingTokenAddress, MIN_STAKE_250)
    indexerAddress = indexer.address
  })

  describe('Check constructor', async () => {
    it('should set the staking token address correctly', async () => {
      const actualAddress = await indexer.stakeToken()
      equal(
        actualAddress,
        stakingTokenAddress,
        'Staking token was set incorrectly'
      )
    })

    it('should set the staking minimum correctly', async () => {
      const actualMinimum = await indexer.stakeMinimum()
      equal(actualMinimum, MIN_STAKE_250, 'Staking minimum was set incorrectly')
    })

    it('should emit an event in the constructor', async () => {
      // create a new indexer
      const newIndexer = await Indexer.new(stakingTokenAddress, MIN_STAKE_250)

      // get the tx hash and get the transaction result from it
      let txHash = newIndexer.transactionHash
      result = await getResult(newIndexer, txHash)

      emitted(result, 'SetStakeMinimum')
    })
  })
})
