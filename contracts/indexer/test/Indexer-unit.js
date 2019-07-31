const Indexer = artifacts.require('Indexer')
const MockContract = artifacts.require('MockContract')
const FungibleToken = artifacts.require('FungibleToken')

const { emitted, reverted, equal, ok } = require('@airswap/test-utils').assert
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
  })


})
