const Locker = artifacts.require('Locker')
const FungibleToken = artifacts.require('FungibleToken')

const { emitted, equal } = require('@airswap/test-utils').assert

contract('Locker', async accounts => {
  const ownerAddress = accounts[0]
  const aliceAddress = accounts[1]
  const bobAddress = accounts[2]

  let lockerToken
  let locker

  describe('Deploying...', async () => {
    it('Deployed locker token', async () => {
      lockerToken = await FungibleToken.new()
    })

    it('Deployed Locker contract', async () => {
      locker = await Locker.new('Locker', 'LCK', 4, lockerToken.address, {
        from: ownerAddress,
      })
    })

    it('Mints some tokens for Alice and Bob', async () => {
      emitted(await lockerToken.mint(aliceAddress, 100000000), 'Transfer')
      emitted(await lockerToken.mint(bobAddress, 100000000), 'Transfer')
    })
    it('Approves tokens for Alice and Bob', async () => {
      emitted(
        await lockerToken.approve(locker.address, 100000000, {
          from: aliceAddress,
        }),
        'Approval'
      )
      emitted(
        await lockerToken.approve(locker.address, 100000000, {
          from: bobAddress,
        }),
        'Approval'
      )
    })
  })

  describe('locker and Unlocker', async () => {
    it('Alice locks some tokens', async () => {
      emitted(
        await locker.lock(1000000, {
          from: aliceAddress,
        }),
        'Lock'
      )
      equal((await locker.balanceOf(aliceAddress)).toString(), '1000000')
      equal((await locker.totalSupply()).toString(), '1000000')
    })
    it('Alice unlocks some tokens', async () => {
      emitted(
        await locker.unlock(250000, {
          from: aliceAddress,
        }),
        'Unlock'
      )
      equal((await locker.balanceOf(aliceAddress)).toString(), '750000')
      equal((await locker.totalSupply()).toString(), '750000')
    })
    it('Bob locks some tokens', async () => {
      emitted(
        await locker.lock(500000, {
          from: bobAddress,
        }),
        'Lock'
      )
      equal((await locker.balanceOf(bobAddress)).toString(), '500000')
      equal((await locker.totalSupply()).toString(), '1250000')
    })
  })
})
