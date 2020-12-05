const Pool = artifacts.require('Pool')
const FungibleToken = artifacts.require('FungibleToken')

const { toAtomicString, toDecimalString } = require('@airswap/utils')
const { emitted, equal } = require('@airswap/test-utils').assert

function toWei(value, places) {
  return toAtomicString(value, places || 18)
}

function toDec(value, places) {
  return toDecimalString(value, places || 18)
}

contract('Pool', async accounts => {
  const feeCollectorAddress = accounts[0]
  const aliceAddress = accounts[1]
  const bobAddress = accounts[2]
  const carolAddress = accounts[3]

  const CLAIM_SCALE = 10
  const CLAIM_MAX = 50

  const ALICE_CREDITS = toWei(10000, 4)
  const BOB_CREDITS = toWei(100000, 4)
  const CAROL_CREDITS = toWei(1000000, 4)

  let feeToken
  let pool

  describe('Deploying...', async () => {
    it('Deployed staking token', async () => {
      feeToken = await FungibleToken.new()
      emitted(
        await feeToken.mint(feeCollectorAddress, toWei(1000000)),
        'Transfer'
      )
    })

    it('Deployed AirSwapTokenPlus contract', async () => {
      pool = await Pool.new(CLAIM_SCALE, CLAIM_MAX)
    })
  })

  describe('Claiming', async () => {
    it('Fees added to the pool: 1000', async () => {
      emitted(
        await feeToken.transfer(pool.address, toWei(1000), {
          from: feeCollectorAddress,
        }),
        'Transfer'
      )
    })
    it(`Alice uses ${toDec(ALICE_CREDITS, 4)} to claim ~5`, async () => {
      emitted(
        await pool.claim(ALICE_CREDITS, feeToken.address, {
          from: aliceAddress,
        }),
        'Claim'
      )
      equal(
        (await feeToken.balanceOf(aliceAddress)).toString(),
        toWei('4.950495049504950495')
      )
      equal(
        (await feeToken.balanceOf(pool.address)).toString(),
        toWei('995.049504950495049505')
      )
    })
    it(`Bob uses ${toDec(BOB_CREDITS, 4)} to claim ~45`, async () => {
      emitted(
        await pool.claim(BOB_CREDITS, feeToken.address, {
          from: bobAddress,
        }),
        'Claim'
      )
      equal(
        (await feeToken.balanceOf(bobAddress)).toString(),
        toWei('45.229522952295229522')
      )
      equal(
        (await feeToken.balanceOf(pool.address)).toString(),
        toWei('949.819981998199819983')
      )
    })
    it('Fees are added to the pool: 1000', async () => {
      emitted(
        await feeToken.transfer(pool.address, toWei(1000), {
          from: feeCollectorAddress,
        }),
        'Transfer'
      )
    })
    it(`Carol uses ${toDec(CAROL_CREDITS, 4)} to claim ~487`, async () => {
      emitted(
        await pool.claim(CAROL_CREDITS, feeToken.address, {
          from: carolAddress,
        }),
        'Claim'
      )
      equal(
        (await feeToken.balanceOf(carolAddress)).toString(),
        toWei('487.454995499549954995')
      )
      equal(
        (await feeToken.balanceOf(pool.address)).toString(),
        toWei('1462.364986498649864988')
      )
    })
  })
})
