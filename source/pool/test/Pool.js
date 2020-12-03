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

  const ALICE_CREDITS = toWei(100000, 4)
  const BOB_CREDITS = toWei(150000, 4)
  const CAROL_CREDITS = toWei(500000, 4)

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
    it(`Alice uses ${toDec(ALICE_CREDITS, 4)} to claim ~45`, async () => {
      emitted(
        await pool.claim(ALICE_CREDITS, feeToken.address, {
          from: aliceAddress,
        }),
        'Claim'
      )
      equal(
        (await feeToken.balanceOf(aliceAddress)).toString(),
        toWei('45.454545454545454545')
      )
      equal(
        (await feeToken.balanceOf(pool.address)).toString(),
        toWei('954.545454545454545455')
      )
    })
    it(`Bob uses ${toDec(BOB_CREDITS, 4)} to claim ~62`, async () => {
      emitted(
        await pool.claim(BOB_CREDITS, feeToken.address, {
          from: bobAddress,
        }),
        'Claim'
      )
      equal(
        (await feeToken.balanceOf(bobAddress)).toString(),
        toWei('62.252964426877470355')
      )
      equal(
        (await feeToken.balanceOf(pool.address)).toString(),
        toWei('892.292490118577075100')
      )
    })
    it('Fees are added to the pool: 3000', async () => {
      emitted(
        await feeToken.transfer(pool.address, toWei(3000), {
          from: feeCollectorAddress,
        }),
        'Transfer'
      )
    })
    it(`Carol uses ${toDec(CAROL_CREDITS, 4)} to claim ~648`, async () => {
      emitted(
        await pool.claim(CAROL_CREDITS, feeToken.address, {
          from: carolAddress,
        }),
        'Claim'
      )
      equal(
        (await feeToken.balanceOf(carolAddress)).toString(),
        toWei('648.715415019762845850')
      )
      equal(
        (await feeToken.balanceOf(pool.address)).toString(),
        toWei('3243.577075098814229250')
      )
    })
  })
})
