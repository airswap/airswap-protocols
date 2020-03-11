const Indexer = artifacts.require('Indexer')
const MockContract = artifacts.require('MockContract')
const FungibleToken = artifacts.require('FungibleToken')

const { ADDRESS_ZERO, INDEX_HEAD } = require('@airswap/constants')
const {
  emitted,
  notEmitted,
  reverted,
  equal,
  passes,
} = require('@airswap/test-utils').assert
const { revertToSnapshot, takeSnapshot } = require('@airswap/test-utils').time
const { padAddressToLocator } = require('@airswap/test-utils').padding

const LOCATORS = 0
const SCORES = 1
const NEXTID = 2

contract('Indexer Unit Tests', async accounts => {
  const owner = accounts[0]
  const nonOwner = accounts[1]
  const aliceAddress = accounts[2]
  const bobAddress = accounts[3]
  const carolAddress = accounts[4]

  const aliceLocator = padAddressToLocator(aliceAddress)
  const bobLocator = padAddressToLocator(bobAddress)
  const carolLocator = padAddressToLocator(carolAddress)
  const emptyLocator = padAddressToLocator(ADDRESS_ZERO)

  const PROTOCOL_1 = '0x0001'
  const PROTOCOL_2 = '0x0002'

  let indexer
  let snapshotId
  let stakingTokenMock
  let stakingTokenAddress

  let result

  let whitelistMock
  let whitelistAddress
  let whitelistedIndexer
  let fungibleTokenTemplate

  const tokenOne = accounts[8]
  const tokenTwo = accounts[9]

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
    const snapShot = await takeSnapshot()
    snapshotId = snapShot['result']
  })

  afterEach(async () => {
    await revertToSnapshot(snapshotId)
  })

  before('Setup contracts', async () => {
    await setupMockContracts()
    indexer = await Indexer.new(stakingTokenAddress)
    whitelistedIndexer = await Indexer.new(stakingTokenAddress)
    await whitelistedIndexer.setLocatorWhitelist(PROTOCOL_1, whitelistAddress)
  })

  describe('Check constructor', async () => {
    it('should set the staking token address correctly', async () => {
      const actualAddress = await indexer.stakingToken()
      equal(
        actualAddress,
        stakingTokenAddress,
        'Staking token was set incorrectly'
      )
    })
  })

  describe('Test createIndex', async () => {
    it('createIndex should emit an event and create a new index', async () => {
      const result = await indexer.createIndex(tokenOne, tokenTwo, PROTOCOL_1, {
        from: aliceAddress,
      })

      // event is emitted
      emitted(result, 'CreateIndex', event => {
        return (
          event.signerToken === tokenOne &&
          event.senderToken === tokenTwo &&
          event.protocol == PROTOCOL_1
        )
      })
    })

    it('createIndex should create index for same token pair but different protocol', async () => {
      // create an index for protocol 1
      await indexer.createIndex(tokenOne, tokenTwo, PROTOCOL_1, {
        from: aliceAddress,
      })

      // now create the same market but different protocol
      const result = await indexer.createIndex(tokenOne, tokenTwo, PROTOCOL_2, {
        from: aliceAddress,
      })

      // event is emitted
      emitted(result, 'CreateIndex', event => {
        return (
          event.signerToken === tokenOne &&
          event.senderToken === tokenTwo &&
          event.protocol == PROTOCOL_2
        )
      })
    })

    it('createIndex should just return an address if the index exists', async () => {
      // create the index - so that it already exists
      await indexer.createIndex(tokenOne, tokenTwo, PROTOCOL_1, {
        from: aliceAddress,
      })

      // now trying to create it again will not emit the event
      const result = await indexer.createIndex(tokenOne, tokenTwo, PROTOCOL_1, {
        from: aliceAddress,
      })

      notEmitted(result, 'CreateIndex', event => {
        return (
          event.signerToken === tokenOne &&
          event.senderToken === tokenTwo &&
          event.protocol === PROTOCOL_1
        )
      })
    })
  })

  describe('Test addTokenToBlacklist and removeTokenFromBlacklist', async () => {
    it('should not allow a non-owner to blacklist a token', async () => {
      await reverted(
        indexer.addTokenToBlacklist(tokenOne, {
          from: nonOwner,
        }),
        'Ownable: caller is not the owner'
      )
    })

    it('should allow the owner to blacklist a token', async () => {
      const result = await indexer.addTokenToBlacklist(tokenOne, {
        from: owner,
      })

      // check the event was emitted
      emitted(result, 'AddTokenToBlacklist', event => {
        return event.token === tokenOne
      })

      // check the token is now on the blacklist
      const isBlacklisted = await indexer.tokenBlacklist.call(tokenOne)
      equal(isBlacklisted, true)
    })

    it('should not emit an event if token is already blacklisted', async () => {
      // add to blacklist
      await indexer.addTokenToBlacklist(tokenOne, {
        from: owner,
      })

      // now try to add it again
      const tx = await indexer.addTokenToBlacklist(tokenOne, {
        from: owner,
      })

      // passes but doesnt emit an event
      passes(tx)
      notEmitted(tx, 'AddTokenToBlacklist')
    })

    it('should not allow a non-owner to un-blacklist a token', async () => {
      await reverted(
        indexer.removeTokenFromBlacklist(tokenOne, {
          from: nonOwner,
        }),
        'Ownable: caller is not the owner'
      )
    })

    it('should allow the owner to un-blacklist a token', async () => {
      // removing from blacklist before the token is blacklisted emits no events
      let result = await indexer.removeTokenFromBlacklist(tokenOne, {
        from: owner,
      })
      notEmitted(result, 'RemoveTokenFromBlacklist')
      passes(result)

      // Add the token to the blacklist
      await indexer.addTokenToBlacklist(tokenOne, {
        from: owner,
      })

      // Now removing it succeeds and emits an event
      result = await indexer.removeTokenFromBlacklist(tokenOne, {
        from: owner,
      })
      emitted(result, 'RemoveTokenFromBlacklist', event => {
        return event.token === tokenOne
      })
      passes(result)
    })
  })

  describe('Test setIntent', async () => {
    it('should not set an intent if the index doesnt exist', async () => {
      await reverted(
        indexer.setIntent(tokenOne, tokenTwo, PROTOCOL_1, 250, aliceLocator, {
          from: aliceAddress,
        }),
        'INDEX_DOES_NOT_EXIST'
      )
    })

    it('should not set an intent if the locator is not whitelisted', async () => {
      // make the index first
      await whitelistedIndexer.createIndex(tokenOne, tokenTwo, PROTOCOL_1, {
        from: aliceAddress,
      })

      await reverted(
        whitelistedIndexer.setIntent(
          tokenOne,
          tokenTwo,
          PROTOCOL_1,
          250,
          aliceLocator,
          {
            from: aliceAddress,
          }
        ),
        'LOCATOR_NOT_WHITELISTED'
      )
    })

    it('should not set an intent if a token is blacklisted', async () => {
      // make the index first
      await indexer.createIndex(tokenOne, tokenTwo, PROTOCOL_1, {
        from: aliceAddress,
      })

      // blacklist tokenOne
      await indexer.addTokenToBlacklist(tokenOne, {
        from: owner,
      })

      // now try to stake with a blacklisted tokenOne
      await reverted(
        indexer.setIntent(tokenOne, tokenTwo, PROTOCOL_1, 250, aliceLocator, {
          from: aliceAddress,
        }),
        'PAIR_IS_BLACKLISTED'
      )

      await indexer.removeTokenFromBlacklist(tokenOne, {
        from: owner,
      })

      // blacklist tokenTwo
      await indexer.addTokenToBlacklist(tokenTwo, {
        from: owner,
      })

      // now try to stake with a blacklisted tokenTwo
      await reverted(
        indexer.setIntent(tokenOne, tokenTwo, PROTOCOL_1, 250, aliceLocator, {
          from: aliceAddress,
        }),
        'PAIR_IS_BLACKLISTED'
      )
    })

    it('should not set an intent if the staking tokens arent approved', async () => {
      // make the index first
      await indexer.createIndex(tokenOne, tokenTwo, PROTOCOL_1, {
        from: aliceAddress,
      })

      // The transfer is not approved
      await stakingTokenMock.givenAnyReturnBool(false)

      // now try to set an intent
      await reverted(
        indexer.setIntent(tokenOne, tokenTwo, PROTOCOL_1, 250, aliceLocator, {
          from: aliceAddress,
        }),
        'STAKING_FAILED'
      )
    })

    it('should set a valid intent on a non-whitelisted indexer', async () => {
      // make the index first
      await indexer.createIndex(tokenOne, tokenTwo, PROTOCOL_1, {
        from: aliceAddress,
      })

      // now set an intent
      const result = await indexer.setIntent(
        tokenOne,
        tokenTwo,
        PROTOCOL_1,
        250,
        aliceLocator,
        {
          from: aliceAddress,
        }
      )
      passes(result)

      emitted(result, 'Stake', event => {
        return (
          event.staker === aliceAddress &&
          event.signerToken === tokenOne &&
          event.senderToken == tokenTwo &&
          event.protocol === PROTOCOL_1 &&
          event.stakeAmount.toNumber() === 250
        )
      })
    })

    it('should set 2 intents for different protocols on the same market', async () => {
      // make the indexes first
      await indexer.createIndex(tokenOne, tokenTwo, PROTOCOL_1, {
        from: aliceAddress,
      })
      // make the index first
      await indexer.createIndex(tokenOne, tokenTwo, PROTOCOL_2, {
        from: aliceAddress,
      })

      // now set an intent
      let result = await indexer.setIntent(
        tokenOne,
        tokenTwo,
        PROTOCOL_1,
        100,
        aliceLocator,
        {
          from: aliceAddress,
        }
      )
      passes(result)

      emitted(result, 'Stake', event => {
        return (
          event.staker === aliceAddress &&
          event.signerToken === tokenOne &&
          event.senderToken == tokenTwo &&
          event.protocol === PROTOCOL_1 &&
          event.stakeAmount.toNumber() === 100
        )
      })

      // now set the other intent
      result = await indexer.setIntent(
        tokenOne,
        tokenTwo,
        PROTOCOL_2,
        150,
        aliceLocator,
        {
          from: aliceAddress,
        }
      )
      passes(result)

      emitted(result, 'Stake', event => {
        return (
          event.staker === aliceAddress &&
          event.signerToken === tokenOne &&
          event.senderToken == tokenTwo &&
          event.protocol === PROTOCOL_2 &&
          event.stakeAmount.toNumber() === 150
        )
      })
    })

    it('should set a valid intent on a whitelisted indexer', async () => {
      // make the index first
      await whitelistedIndexer.createIndex(tokenOne, tokenTwo, PROTOCOL_1, {
        from: aliceAddress,
      })

      // whitelist the locator
      await whitelistMock.givenAnyReturnBool(true)

      // now set an intent
      const result = await whitelistedIndexer.setIntent(
        tokenOne,
        tokenTwo,
        PROTOCOL_1,
        250,
        bobLocator,
        {
          from: bobAddress,
        }
      )
      passes(result)

      emitted(result, 'Stake', event => {
        return (
          event.staker === bobAddress &&
          event.signerToken === tokenOne &&
          event.senderToken == tokenTwo &&
          event.protocol === PROTOCOL_1 &&
          event.stakeAmount.toNumber() === 250
        )
      })
    })

    it('should update an intent if the user has already staked - increase stake', async () => {
      // make the index first
      await indexer.createIndex(tokenOne, tokenTwo, PROTOCOL_1, {
        from: aliceAddress,
      })

      // set one intent
      await indexer.setIntent(
        tokenOne,
        tokenTwo,
        PROTOCOL_1,
        250,
        aliceLocator,
        {
          from: aliceAddress,
        }
      )

      let stakedAmount = await indexer.getStakedAmount.call(
        aliceAddress,
        tokenOne,
        tokenTwo,
        PROTOCOL_1
      )

      equal(stakedAmount, 250, 'Staked amount incorrect')

      // now try to set another - increasing the stake
      const result = await indexer.setIntent(
        tokenOne,
        tokenTwo,
        PROTOCOL_1,
        350,
        aliceLocator,
        {
          from: aliceAddress,
        }
      )

      emitted(result, 'Stake')

      stakedAmount = await indexer.getStakedAmount.call(
        aliceAddress,
        tokenOne,
        tokenTwo,
        PROTOCOL_1
      )

      equal(stakedAmount, 350, 'Staked amount did not increase')
    })

    it('should fail updating the intent when transfer of staking tokens fails', async () => {
      // make the index first
      await indexer.createIndex(tokenOne, tokenTwo, PROTOCOL_1, {
        from: aliceAddress,
      })

      // set one intent
      await indexer.setIntent(
        tokenOne,
        tokenTwo,
        PROTOCOL_1,
        250,
        aliceLocator,
        {
          from: aliceAddress,
        }
      )

      let stakedAmount = await indexer.getStakedAmount.call(
        aliceAddress,
        tokenOne,
        tokenTwo,
        PROTOCOL_1
      )

      equal(stakedAmount, 250, 'Staked amount incorrect')

      // Ensure token transfers will now fail
      await stakingTokenMock.givenAnyReturnBool(false)

      // now try to update an intent by increasing transfer by 100
      await reverted(
        indexer.setIntent(tokenOne, tokenTwo, PROTOCOL_1, 350, aliceLocator, {
          from: aliceAddress,
        }),
        'STAKING_FAILED'
      )

      stakedAmount = await indexer.getStakedAmount.call(
        aliceAddress,
        tokenOne,
        tokenTwo,
        PROTOCOL_1
      )

      // Check that the staked amount has not been changed
      equal(stakedAmount, 250, 'Staked amount incorrect')

      // Reduce the intent with the transfer ultimately failing
      await reverted(
        indexer.setIntent(tokenOne, tokenTwo, PROTOCOL_1, 10, aliceLocator, {
          from: aliceAddress,
        })
      )

      stakedAmount = await indexer.getStakedAmount.call(
        aliceAddress,
        tokenOne,
        tokenTwo,
        PROTOCOL_1
      )

      // ensure that the staked amount does not change
      equal(stakedAmount, 250, 'Staked amount incorrect')
    })

    it('should update an intent if the user has already staked - decrease stake', async () => {
      // make the index first
      await indexer.createIndex(tokenOne, tokenTwo, PROTOCOL_1, {
        from: aliceAddress,
      })

      // set one intent
      await indexer.setIntent(
        tokenOne,
        tokenTwo,
        PROTOCOL_1,
        250,
        aliceLocator,
        {
          from: aliceAddress,
        }
      )

      let stakedAmount = await indexer.getStakedAmount.call(
        aliceAddress,
        tokenOne,
        tokenTwo,
        PROTOCOL_1
      )

      equal(stakedAmount, 250, 'Staked amount incorrect')

      // now try to set another - decreasing the stake
      const result = await indexer.setIntent(
        tokenOne,
        tokenTwo,
        PROTOCOL_1,
        150,
        aliceLocator,
        {
          from: aliceAddress,
        }
      )

      emitted(result, 'Stake')

      stakedAmount = await indexer.getStakedAmount.call(
        aliceAddress,
        tokenOne,
        tokenTwo,
        PROTOCOL_1
      )

      equal(stakedAmount, 150, 'Staked amount did not decrease')
    })

    it('should update an intent if the user has already staked - same stake', async () => {
      // make the index first
      await indexer.createIndex(tokenOne, tokenTwo, PROTOCOL_1, {
        from: aliceAddress,
      })

      // set one intent
      await indexer.setIntent(
        tokenOne,
        tokenTwo,
        PROTOCOL_1,
        250,
        aliceLocator,
        {
          from: aliceAddress,
        }
      )

      let stakedAmount = await indexer.getStakedAmount.call(
        aliceAddress,
        tokenOne,
        tokenTwo,
        PROTOCOL_1
      )

      equal(stakedAmount, 250, 'Staked amount incorrect')

      // now try to set another - decreasing the stake
      const result = await indexer.setIntent(
        tokenOne,
        tokenTwo,
        PROTOCOL_1,
        250,
        bobLocator,
        {
          from: aliceAddress,
        }
      )

      emitted(result, 'Stake')

      stakedAmount = await indexer.getStakedAmount.call(
        aliceAddress,
        tokenOne,
        tokenTwo,
        PROTOCOL_1
      )

      equal(stakedAmount, 250, 'Staked amount did not stay same')
    })
  })

  describe('Test unsetIntent', async () => {
    it('should not unset an intent if the index doesnt exist', async () => {
      await reverted(
        indexer.unsetIntent(tokenOne, tokenTwo, PROTOCOL_1, {
          from: aliceAddress,
        }),
        'INDEX_DOES_NOT_EXIST'
      )
    })

    it('should not unset an intent if the intent does not exist', async () => {
      // create the index
      await indexer.createIndex(tokenOne, tokenTwo, PROTOCOL_1, {
        from: aliceAddress,
      })

      // now try to unset a non-existent intent
      await reverted(
        indexer.unsetIntent(tokenOne, tokenTwo, PROTOCOL_1, {
          from: aliceAddress,
        }),
        'ENTRY_DOES_NOT_EXIST'
      )
    })

    it('should successfully unset an intent', async () => {
      // create the index
      await indexer.createIndex(tokenOne, tokenTwo, PROTOCOL_1, {
        from: aliceAddress,
      })

      // create the intent
      await indexer.setIntent(
        tokenOne,
        tokenTwo,
        PROTOCOL_1,
        250,
        aliceLocator,
        {
          from: aliceAddress,
        }
      )

      // now try to unset the intent
      const tx = await indexer.unsetIntent(tokenOne, tokenTwo, PROTOCOL_1, {
        from: aliceAddress,
      })

      // passes and emits and event
      passes(tx)
      emitted(tx, 'Unstake', event => {
        return (
          event.staker === aliceAddress &&
          event.signerToken === tokenOne &&
          event.senderToken == tokenTwo &&
          event.stakeAmount.toNumber() === 250
        )
      })
    })

    it('should revert if unset an intent failed in token transfer', async () => {
      // create the index
      await indexer.createIndex(tokenOne, tokenTwo, PROTOCOL_1, {
        from: aliceAddress,
      })

      // create the intent
      await indexer.setIntent(
        tokenOne,
        tokenTwo,
        PROTOCOL_1,
        10,
        aliceLocator,
        {
          from: aliceAddress,
        }
      )

      // mock the token transfer method to fail
      const token_transfer = fungibleTokenTemplate.contract.methods
        .transfer(ADDRESS_ZERO, 0)
        .encodeABI()

      // The token transfer should revert
      await stakingTokenMock.givenMethodRevert(token_transfer)

      // reverts if transfer failed
      await reverted(
        indexer.unsetIntent(tokenOne, tokenTwo, PROTOCOL_1, {
          from: aliceAddress,
        })
      )
    })
  })

  describe('Test getLocators', async () => {
    it('should return blank results if the index doesnt exist', async () => {
      result = await indexer.getLocators.call(
        tokenOne,
        tokenTwo,
        PROTOCOL_1,
        ADDRESS_ZERO,
        3
      )
      equal(result[LOCATORS].length, 0, 'locators array should be size 0')
      equal(result[SCORES].length, 0, 'scores array should be size 0')
      equal(result[NEXTID], ADDRESS_ZERO, 'next identifier should be 0x0')
    })

    it('should return blank results if a token is blacklisted', async () => {
      // create index
      await indexer.createIndex(tokenOne, tokenTwo, PROTOCOL_1, {
        from: aliceAddress,
      })

      // set an intent staking 0
      await indexer.setIntent(tokenOne, tokenTwo, PROTOCOL_1, 0, aliceLocator, {
        from: aliceAddress,
      })

      // blacklist tokenOne
      await indexer.addTokenToBlacklist(tokenOne, {
        from: owner,
      })

      // now try to get the intents
      result = await indexer.getLocators.call(
        tokenOne,
        tokenTwo,
        PROTOCOL_1,
        ADDRESS_ZERO,
        4
      )
      equal(result[LOCATORS].length, 0, 'locators array should be size 0')
      equal(result[SCORES].length, 0, 'scores array should be size 0')
      equal(result[NEXTID], ADDRESS_ZERO, 'next identifier should be 0x0')
    })

    it('should otherwise return the intents', async () => {
      // create index
      await indexer.createIndex(tokenOne, tokenTwo, PROTOCOL_1, {
        from: aliceAddress,
      })

      // set two intents
      await indexer.setIntent(
        tokenOne,
        tokenTwo,
        PROTOCOL_1,
        50,
        aliceLocator,
        {
          from: aliceAddress,
        }
      )
      await indexer.setIntent(tokenOne, tokenTwo, PROTOCOL_1, 100, bobLocator, {
        from: bobAddress,
      })
      await indexer.setIntent(
        tokenOne,
        tokenTwo,
        PROTOCOL_1,
        75,
        carolLocator,
        {
          from: carolAddress,
        }
      )

      // now try to get the intents
      result = await indexer.getLocators.call(
        tokenOne,
        tokenTwo,
        PROTOCOL_1,
        ADDRESS_ZERO,
        4
      )

      equal(result[LOCATORS].length, 3, 'locators array should be size 3')
      equal(result[LOCATORS][0], bobLocator, 'intent should be bob')
      equal(result[LOCATORS][1], carolLocator, 'intent should be carol')
      equal(result[LOCATORS][2], aliceLocator, 'intent should be alice')

      equal(result[SCORES].length, 3, 'scores array should be size 3')
      equal(result[SCORES][0], 100, 'score should be bob')
      equal(result[SCORES][1], 75, 'score should be carol')
      equal(result[SCORES][2], 50, 'score should be alice')

      equal(result[NEXTID], INDEX_HEAD, 'next identifier should be the head')

      // should only get the number specified
      result = await indexer.getLocators.call(
        tokenOne,
        tokenTwo,
        PROTOCOL_1,
        ADDRESS_ZERO,
        1
      )
      equal(result[LOCATORS].length, 1, 'locators array should be size 1')
      equal(result[SCORES].length, 1, 'scores array should be size 1')
      equal(result[LOCATORS][0], bobLocator, 'intent should be bob')
      equal(result[SCORES][0], 100, 'score should be bob')
      equal(result[NEXTID], carolAddress, 'next identifier should be carol')

      // should start in the specified location
      result = await indexer.getLocators.call(
        tokenOne,
        tokenTwo,
        PROTOCOL_1,
        carolAddress,
        5
      )

      equal(result[LOCATORS].length, 3, 'intents array should be size 3')
      equal(result[LOCATORS][0], carolLocator, 'intent should be carol')
      equal(result[LOCATORS][1], aliceLocator, 'intent should be alice')
      equal(result[LOCATORS][2], emptyLocator, 'intent should be empty')

      equal(result[SCORES][0], 75, 'score should be carol')
      equal(result[SCORES][1], 50, 'score should be alice')
      equal(result[SCORES][2], 0, 'score should be empty')

      equal(result[NEXTID], INDEX_HEAD, 'next identifier should be the head')
    })
  })

  describe('Test getStakedAmount.call', async () => {
    it('should return 0 if the index does not exist', async () => {
      const val = await indexer.getStakedAmount.call(
        aliceAddress,
        tokenOne,
        tokenTwo,
        PROTOCOL_1,
        {
          from: aliceAddress,
        }
      )

      equal(val, 0)
    })

    it('should retrieve the score on a token pair for a user', async () => {
      // create index
      await indexer.createIndex(tokenOne, tokenTwo, PROTOCOL_1, {
        from: aliceAddress,
      })

      const stakeAmount = 1000
      await indexer.setIntent(
        tokenOne,
        tokenTwo,
        PROTOCOL_1,
        stakeAmount,
        aliceLocator,
        {
          from: aliceAddress,
        }
      )

      const val = await indexer.getStakedAmount.call(
        aliceAddress,
        tokenOne,
        tokenTwo,
        PROTOCOL_1
      )
      equal(val.toNumber(), stakeAmount, 'stake was improperly saved')
    })
  })
})
