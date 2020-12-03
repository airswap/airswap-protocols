const Locker = artifacts.require('Locker')
const FungibleToken = artifacts.require('FungibleToken')

const { emitted } = require('@airswap/test-utils').assert

contract('Locker', async accounts => {
  const ownerAddress = accounts[0]
  const aliceAddress = accounts[1]
  const bobAddress = accounts[2]

  let lockingToken
  let locker

  describe('Deploying...', async () => {
    it('Deployed locking token', async () => {
      lockingToken = await FungibleToken.new()
    })

    it('Deployed Locker contract', async () => {
      locker = await Locker.new('Locker', 'LCK', 4, lockingToken.address, {
        from: ownerAddress,
      })
    })

    it('Mints some tokens for Alice and Bob', async () => {
      emitted(await lockingToken.mint(aliceAddress, 100000000), 'Transfer')
      emitted(await lockingToken.mint(bobAddress, 100000000), 'Transfer')
    })
    it('Approves tokens for Alice and Bob', async () => {
      emitted(
        await lockingToken.approve(locker.address, 100000000, {
          from: aliceAddress,
        }),
        'Approval'
      )
      emitted(
        await lockingToken.approve(locker.address, 100000000, {
          from: bobAddress,
        }),
        'Approval'
      )
    })
  })

  describe('Locking and Unlocking', async () => {
    it('Alice locks some tokens', async () => {
      emitted(
        await locker.lock(1000000, {
          from: aliceAddress,
        }),
        'Lock'
      )
    })
  })
})
