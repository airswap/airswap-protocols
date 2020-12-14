const Pool = artifacts.require('Pool')
const ERC20PresetMinterPauser = artifacts.require('ERC20PresetMinterPauser')

const { soliditySha3 } = require('web3-utils')

const { toAtomicString, toDecimalString } = require('@airswap/utils')
const { emitted, equal, reverted } = require('@airswap/test-utils').assert

const { generateTreeFromData, getRoot, getProof } = require('@airswap/merkle')

function toWei(value, places) {
  return toAtomicString(value, places || 18)
}

function toDec(value, places) {
  return toDecimalString(value, places || 18)
}

contract('Pool', async accounts => {
  const ownerAddress = accounts[0]
  const feeCollectorAddress = accounts[1]
  const aliceAddress = accounts[2]
  const bobAddress = accounts[3]
  const carolAddress = accounts[4]

  const CLAIM_SCALE = 10
  const CLAIM_MAX = 50

  const ALICE_SCORE = toWei(10000, 4)
  const BOB_SCORE = toWei(100000, 4)
  const CAROL_SCORE = toWei(1000000, 4)
  const CAROL_BAD_SCORE = toWei(5000000, 4)

  let tree
  let feeToken
  let pool

  describe('Deploying...', async () => {
    it('Deployed staking token', async () => {
      feeToken = await ERC20PresetMinterPauser.new('Fee', 'FEE')
      emitted(
        await feeToken.mint(feeCollectorAddress, toWei(1000000)),
        'Transfer'
      )
    })

    it('Deployed AirSwapTokenPlus contract', async () => {
      pool = await Pool.new(CLAIM_SCALE, CLAIM_MAX, { from: ownerAddress })
    })
  })

  describe('Seeding', async () => {
    tree = generateTreeFromData({
      [aliceAddress]: ALICE_SCORE,
      [bobAddress]: BOB_SCORE,
      [carolAddress]: CAROL_SCORE,
    })

    it('Set the root', async () => {
      emitted(
        await pool.enable(getRoot(tree), {
          from: ownerAddress,
        }),
        'Enable'
      )
    })

    it('Fees added to the pool: 1000', async () => {
      emitted(
        await feeToken.transfer(pool.address, toWei(1000), {
          from: feeCollectorAddress,
        }),
        'Transfer'
      )
    })
  })

  describe('Claiming', async () => {
    it(`Alice uses ${toDec(ALICE_SCORE, 4)} to claim ~5`, async () => {
      const proof = getProof(tree, soliditySha3(aliceAddress, ALICE_SCORE))

      emitted(
        await pool.single(getRoot(tree), ALICE_SCORE, proof, feeToken.address, {
          from: aliceAddress,
        }),
        'Single'
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
    it(`Bob uses ${toDec(BOB_SCORE, 4)} to claim ~45`, async () => {
      const proof = getProof(tree, soliditySha3(bobAddress, BOB_SCORE))

      emitted(
        await pool.single(getRoot(tree), BOB_SCORE, proof, feeToken.address, {
          from: bobAddress,
        }),
        'Single'
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
    it(`Bob tries to claim again and fails`, async () => {
      const proof = getProof(tree, soliditySha3(bobAddress, BOB_SCORE))

      await reverted(
        pool.single(getRoot(tree), BOB_SCORE, proof, feeToken.address, {
          from: bobAddress,
        }),
        'CLAIM_INVALID'
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
    it(`Carol tries to claim using a bad tree`, async () => {
      const badTree = generateTreeFromData({
        [aliceAddress]: ALICE_SCORE,
        [bobAddress]: BOB_SCORE,
        [carolAddress]: CAROL_BAD_SCORE,
      })
      const proof = getProof(
        badTree,
        soliditySha3(carolAddress, CAROL_BAD_SCORE)
      )

      await reverted(
        pool.single(
          getRoot(badTree),
          CAROL_BAD_SCORE,
          proof,
          feeToken.address,
          {
            from: carolAddress,
          }
        ),
        'ROOT_NOT_ENABLED'
      )
    })
    it(`Carol tries to claim more than available`, async () => {
      const proof = getProof(
        generateTreeFromData({
          [aliceAddress]: ALICE_SCORE,
          [bobAddress]: BOB_SCORE,
          [carolAddress]: CAROL_BAD_SCORE,
        }),
        soliditySha3(carolAddress, CAROL_BAD_SCORE)
      )
      await reverted(
        pool.single(getRoot(tree), CAROL_BAD_SCORE, proof, feeToken.address, {
          from: carolAddress,
        }),
        'PROOF_INVALID'
      )
    })
    it(`Carol tries to claim using a bad tree`, async () => {
      const badTree = generateTreeFromData({
        [aliceAddress]: ALICE_SCORE,
        [bobAddress]: BOB_SCORE,
        [carolAddress]: CAROL_BAD_SCORE,
      })
      const proof = getProof(
        badTree,
        soliditySha3(carolAddress, CAROL_BAD_SCORE)
      )

      await reverted(
        pool.bulk(
          [
            {
              root: getRoot(tree),
              score: CAROL_BAD_SCORE,
              proof: proof,
            },
          ],
          feeToken.address,
          {
            from: carolAddress,
          }
        ),
        'PROOF_INVALID'
      )
    })
    it(`Carol tries to claim more than available`, async () => {
      const proof = getProof(
        generateTreeFromData({
          [aliceAddress]: ALICE_SCORE,
          [bobAddress]: BOB_SCORE,
          [carolAddress]: CAROL_BAD_SCORE,
        }),
        soliditySha3(carolAddress, CAROL_BAD_SCORE)
      )
      await reverted(
        pool.bulk(
          [
            {
              root: getRoot(tree),
              score: CAROL_BAD_SCORE,
              proof: proof,
            },
          ],
          feeToken.address,
          {
            from: carolAddress,
          }
        ),
        'PROOF_INVALID'
      )
    })
    it(`Carol tries to bulk claim zero claims and fails`, async () => {
      await reverted(pool.bulk([], feeToken.address), 'NO_CLAIMS_PROVIDED')
    })
    it(`Carol uses ${toDec(CAROL_SCORE, 4)} to claim ~487`, async () => {
      const proof = getProof(tree, soliditySha3(carolAddress, CAROL_SCORE))

      emitted(
        await pool.bulk(
          [
            {
              root: getRoot(tree),
              score: CAROL_SCORE,
              proof: proof,
            },
          ],
          feeToken.address,
          {
            from: carolAddress,
          }
        ),
        'Bulk'
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
    it(`Carol tries to claim again and fails`, async () => {
      const proof = getProof(tree, soliditySha3(carolAddress, CAROL_SCORE))

      await reverted(
        pool.bulk(
          [
            {
              root: getRoot(tree),
              score: CAROL_SCORE,
              proof: proof,
            },
          ],
          feeToken.address,
          {
            from: carolAddress,
          }
        ),
        'CLAIM_INVALID'
      )
    })
  })
})
