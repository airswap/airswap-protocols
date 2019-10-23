const Indexer = artifacts.require('Indexer')
const MockContract = artifacts.require('MockContract')
const FungibleToken = artifacts.require('FungibleToken')

const {
  emitted,
  notEmitted,
  reverted,
  equal,
  passes,
} = require('@airswap/test-utils').assert
const { revertToSnapShot, takeSnapshot } = require('@airswap/test-utils').time
const { EMPTY_ADDRESS } = require('@airswap/order-utils').constants
const { padAddressToLocator } = require('@airswap/test-utils').padding

contract('Indexer Unit Tests', async accounts => {
  let owner = accounts[0]
  let nonOwner = accounts[1]
  let aliceAddress = accounts[2]
  let bobAddress = accounts[3]

  let aliceLocator = padAddressToLocator(aliceAddress)
  let bobLocator = padAddressToLocator(bobAddress)

  let indexer
  let snapshotId
  let stakingTokenMock
  let stakingTokenAddress

  let whitelistMock
  let whitelistAddress
  let whitelistedIndexer
  let fungibleTokenTemplate

  let tokenOne = accounts[8]
  let tokenTwo = accounts[9]

  async function setupMockContracts() {
    stakingTokenMock = await MockContract.new()
    await stakingTokenMock.givenAnyReturnBool(true)

    stakingTokenAddress = stakingTokenMock.address

    whitelistMock = await MockContract.new()
    // address is not whitelisted
    await whitelistMock.givenAnyReturnBool(false)

    whitelistAddress = whitelistMock.address

    fungibleTokenTemplate = await FungibleToken.new()
  }

  beforeEach(async () => {
    let snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapShot(snapshotId)
  })

  before('Setup contracts', async () => {
    await setupMockContracts()
    indexer = await Indexer.new(stakingTokenAddress, EMPTY_ADDRESS)
    whitelistedIndexer = await Indexer.new(
      stakingTokenAddress,
      whitelistAddress
    )
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
  })

  describe('Test createIndex', async () => {
    it('createIndex should emit an event and create a new index', async () => {
      let result = await indexer.createIndex(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // event is emitted
      emitted(result, 'CreateIndex', event => {
        return event.signerToken === tokenOne && event.senderToken === tokenTwo
      })
    })

    it('createIndex should just return an address if the index exists', async () => {
      // create the index - so that it already exists
      await indexer.createIndex(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // now trying to create it again will not emit the event
      let result = await indexer.createIndex(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      notEmitted(result, 'CreateIndex', event => {
        return event.signerToken === tokenOne && event.senderToken === tokenTwo
      })
    })
  })

  describe('Test addToBlacklist and removeFromBlacklist', async () => {
    it('should not allow a non-owner to blacklist a token', async () => {
      await reverted(
        indexer.addToBlacklist([tokenOne], {
          from: nonOwner,
        }),
        'Ownable: caller is not the owner'
      )
    })

    it('should allow the owner to blacklist a token', async () => {
      let result = await indexer.addToBlacklist([tokenOne], {
        from: owner,
      })

      // check the event was emitted
      emitted(result, 'AddToBlacklist', event => {
        return event.token === tokenOne
      })

      // check the token is now on the blacklist
      let isBlacklisted = await indexer.blacklist.call(tokenOne)
      equal(isBlacklisted, true)
    })

    it('should not emit an event if token is already blacklisted', async () => {
      // add to blacklist
      await indexer.addToBlacklist([tokenOne], {
        from: owner,
      })

      // now try to add it again
      let tx = await indexer.addToBlacklist([tokenOne], {
        from: owner,
      })

      // passes but doesnt emit an event
      passes(tx)
      notEmitted(tx, 'AddToBlacklist')
    })

    it('should not allow a non-owner to un-blacklist a token', async () => {
      await reverted(
        indexer.removeFromBlacklist([tokenOne], {
          from: nonOwner,
        }),
        'Ownable: caller is not the owner'
      )
    })

    it('should allow the owner to un-blacklist a token', async () => {
      // removing from blacklist before the token is blacklisted emits no events
      let result = await indexer.removeFromBlacklist([tokenOne], {
        from: owner,
      })
      notEmitted(result, 'RemoveFromBlacklist')
      passes(result)

      // Add the token to the blacklist
      await indexer.addToBlacklist([tokenOne], {
        from: owner,
      })

      // Now removing it succeeds and emits an event
      result = await indexer.removeFromBlacklist([tokenOne], {
        from: owner,
      })
      emitted(result, 'RemoveFromBlacklist', event => {
        return event.token === tokenOne
      })
      passes(result)
    })
  })

  describe('Test setIntent', async () => {
    it('should not set an intent if the index doesnt exist', async () => {
      await reverted(
        indexer.setIntent(tokenOne, tokenTwo, 250, aliceLocator, {
          from: aliceAddress,
        }),
        'INDEX_DOES_NOT_EXIST'
      )
    })

    it('should not set an intent if the locator is not whitelisted', async () => {
      await reverted(
        whitelistedIndexer.setIntent(tokenOne, tokenTwo, 250, aliceLocator, {
          from: aliceAddress,
        }),
        'LOCATOR_NOT_WHITELISTED'
      )
    })

    it('should not set an intent if a token is blacklisted', async () => {
      // blacklist tokenOne
      await indexer.addToBlacklist([tokenOne], {
        from: owner,
      })

      // now try to stake with a blacklisted tokenOne
      await reverted(
        indexer.setIntent(tokenOne, tokenTwo, 250, aliceLocator, {
          from: aliceAddress,
        }),
        'PAIR_IS_BLACKLISTED'
      )

      await indexer.removeFromBlacklist([tokenOne], {
        from: owner,
      })

      // blacklist tokenTwo
      await indexer.addToBlacklist([tokenTwo], {
        from: owner,
      })

      // now try to stake with a blacklisted tokenTwo
      await reverted(
        indexer.setIntent(tokenOne, tokenTwo, 250, aliceLocator, {
          from: aliceAddress,
        }),
        'PAIR_IS_BLACKLISTED'
      )
    })

    it('should not set an intent if the staking tokens arent approved', async () => {
      // make the index first
      await indexer.createIndex(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // The transfer is not approved
      await stakingTokenMock.givenAnyReturnBool(false)

      // now try to set an intent
      await reverted(
        indexer.setIntent(tokenOne, tokenTwo, 250, aliceLocator, {
          from: aliceAddress,
        }),
        'UNABLE_TO_STAKE'
      )
    })

    it('should set a valid intent on a non-whitelisted indexer', async () => {
      // make the index first
      await indexer.createIndex(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // now set an intent
      let result = await indexer.setIntent(
        tokenOne,
        tokenTwo,
        250,
        aliceLocator,
        {
          from: aliceAddress,
        }
      )
      passes(result)

      emitted(result, 'Stake', event => {
        return (
          event.wallet === aliceAddress &&
          event.signerToken === tokenOne &&
          event.senderToken == tokenTwo &&
          event.amount.toNumber() === 250
        )
      })
    })

    it('should set a valid intent on a whitelisted indexer', async () => {
      // make the index first
      await whitelistedIndexer.createIndex(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // whitelist the locator
      await whitelistMock.givenAnyReturnBool(true)

      // now set an intent
      let result = await whitelistedIndexer.setIntent(
        tokenOne,
        tokenTwo,
        250,
        bobLocator,
        {
          from: bobAddress,
        }
      )
      passes(result)

      emitted(result, 'Stake', event => {
        return (
          event.wallet === bobAddress &&
          event.signerToken === tokenOne &&
          event.senderToken == tokenTwo &&
          event.amount.toNumber() === 250
        )
      })
    })

    it('should not set an intent if the user has already staked', async () => {
      // make the index first
      await indexer.createIndex(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // set one intent
      await indexer.setIntent(tokenOne, tokenTwo, 250, aliceLocator, {
        from: aliceAddress,
      })

      // now try to set another
      await reverted(
        indexer.setIntent(tokenOne, tokenTwo, 250, aliceLocator, {
          from: aliceAddress,
        }),
        'LOCATOR_ALREADY_SET'
      )
    })
  })

  describe('Test unsetIntent', async () => {
    it('should not unset an intent if the index doesnt exist', async () => {
      await reverted(
        indexer.unsetIntent(tokenOne, tokenTwo, {
          from: aliceAddress,
        }),
        'INDEX_DOES_NOT_EXIST'
      )
    })

    it('should not unset an intent if the intent does not exist', async () => {
      // create the index
      await indexer.createIndex(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // now try to unset a non-existent intent
      await reverted(
        indexer.unsetIntent(tokenOne, tokenTwo, {
          from: aliceAddress,
        }),
        'LOCATOR_DOES_NOT_EXIST'
      )
    })

    it('should successfully unset an intent', async () => {
      // create the index
      await indexer.createIndex(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // create the intent
      await indexer.setIntent(tokenOne, tokenTwo, 250, aliceLocator, {
        from: aliceAddress,
      })

      // now try to unset the intent
      let tx = await indexer.unsetIntent(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // passes and emits and event
      passes(tx)
      emitted(tx, 'Unstake', event => {
        return (
          event.wallet === aliceAddress &&
          event.signerToken === tokenOne &&
          event.senderToken == tokenTwo &&
          event.amount.toNumber() === 250
        )
      })
    })

    it('should revert if unset an intent failed in token transfer', async () => {
      // create the index
      await indexer.createIndex(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // create the intent
      await indexer.setIntent(tokenOne, tokenTwo, 10, aliceLocator, {
        from: aliceAddress,
      })

      // mock the token transfer method to fail
      let token_transfer = fungibleTokenTemplate.contract.methods
        .transfer(EMPTY_ADDRESS, 0)
        .encodeABI()

      // The token transfer should revert
      await stakingTokenMock.givenMethodRevert(token_transfer)

      // reverts if transfer failed
      await reverted(
        indexer.unsetIntent(tokenOne, tokenTwo, {
          from: aliceAddress,
        })
      )
    })
  })

  describe('Test getIntents', async () => {
    it('should return an empty array if the index doesnt exist', async () => {
      let intents = await indexer.getIntents.call(tokenOne, tokenTwo, 4)
      equal(intents.length, 0, 'intents array should be empty')
    })

    it('should return an empty array if a token is blacklisted', async () => {
      // create index
      await indexer.createIndex(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // set an intent staking 0
      await indexer.setIntent(tokenOne, tokenTwo, 0, aliceLocator, {
        from: aliceAddress,
      })

      // blacklist tokenOne
      await indexer.addToBlacklist([tokenOne], {
        from: owner,
      })

      // now try to get the intents
      let intents = await indexer.getIntents.call(tokenOne, tokenTwo, 4)
      equal(intents.length, 0, 'intents array should be empty')
    })

    it('should otherwise return the intents', async () => {
      // create index
      await indexer.createIndex(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      // set two intents
      await indexer.setIntent(tokenOne, tokenTwo, 50, aliceLocator, {
        from: aliceAddress,
      })
      await indexer.setIntent(tokenOne, tokenTwo, 100, bobLocator, {
        from: bobAddress,
      })

      // now try to get the intents
      let intents = await indexer.getIntents.call(tokenOne, tokenTwo, 4)
      equal(intents.length, 2, 'intents array should be size 2')

      // should only get the number specified
      intents = await indexer.getIntents.call(tokenOne, tokenTwo, 1)
      equal(intents.length, 1, 'intents array should be size 1')
    })
  })

  describe('Test getScore', async () => {
    it('should fail if the index does not exist', async () => {
      await reverted(
        indexer.setIntent(tokenOne, tokenTwo, 1000, aliceLocator, {
          from: aliceAddress,
        }),
        'INDEX_DOES_NOT_EXIST'
      )
    })

    it('should retrieve the score on a token pair for a user', async () => {
      // create index
      await indexer.createIndex(tokenOne, tokenTwo, {
        from: aliceAddress,
      })

      let stakeAmount = 1000
      await indexer.setIntent(tokenOne, tokenTwo, stakeAmount, aliceLocator, {
        from: aliceAddress,
      })

      let val = await indexer.getScore(tokenOne, tokenTwo, aliceAddress)
      equal(val.toNumber(), stakeAmount, 'stake was improperly saved')
    })
  })
})
