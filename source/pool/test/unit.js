const { expect } = require('chai')
const { soliditySha3 } = require('web3-utils')
const { toAtomicString } = require('@airswap/utils')
const { generateTreeFromData, getRoot, getProof } = require('@airswap/merkle')

const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')

function toWei(value, places) {
  return toAtomicString(value, places || 18)
}

describe('Pool Unit Tests', () => {
  let deployer
  let alice
  let bob
  let carol

  const CLAIM_SCALE = 10
  const CLAIM_MAX = 50

  const ALICE_SCORE = toWei(10000, 4)
  const BOB_SCORE = toWei(100000, 4)
  const CAROL_SCORE = toWei(1000000, 4)

  let tree
  let feeToken
  let feeToken2
  let pool
  let snapshotId

  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  before(async () => {
    ;[deployer, alice, bob, carol] = await ethers.getSigners()

    pool = await (
      await ethers.getContractFactory('Pool')
    ).deploy(CLAIM_SCALE, CLAIM_MAX)
    await pool.deployed()

    tree = generateTreeFromData({
      [alice.address]: ALICE_SCORE,
      [bob.address]: BOB_SCORE,
      [carol.address]: CAROL_SCORE,
    })

    feeToken = await deployMockContract(deployer, IERC20.abi)
    feeToken2 = await deployMockContract(deployer, IERC20.abi)
  })

  describe('Test constructor', async () => {
    it('constructor sets values', async () => {
      const storedScale = await pool.scale()
      const storedMax = await pool.max()
      await expect(storedScale).to.equal(CLAIM_SCALE)
      await expect(storedMax).to.equal(CLAIM_MAX)
    })

    it('constructor reverts when percentage is too high', async () => {
      await expect(
        (await ethers.getContractFactory('Pool')).deploy(CLAIM_SCALE, 101)
      ).to.be.revertedWith('MAX_TOO_HIGH')
    })

    it('constructor reverts when scale is too high', async () => {
      await expect(
        (await ethers.getContractFactory('Pool')).deploy(78, CLAIM_MAX)
      ).to.be.revertedWith('SCALE_TOO_HIGH')
    })
  })

  describe('Test enable', async () => {
    it('enable successful', async () => {
      const root = getRoot(tree)
      await expect(await pool.connect(deployer).enable(root)).to.emit(
        pool,
        'Enable'
      )
      expect(await pool.roots(root)).to.equal(true)
    })

    it('enable reverts', async () => {
      const root = getRoot(tree)
      await expect(await pool.connect(deployer).enable(root)).to.emit(
        pool,
        'Enable'
      )
      await expect(pool.connect(deployer).enable(root)).to.be.revertedWith(
        'ROOT_EXISTS'
      )
    })
  })

  describe('Test withdraw', async () => {
    it('withdraw success', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)

      const root = getRoot(tree)
      await pool.connect(deployer).enable(root)

      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))
      await expect(
        await pool.connect(alice).withdraw(
          [
            {
              root: getRoot(tree),
              score: ALICE_SCORE,
              proof,
            },
          ],
          feeToken.address
        )
      ).to.emit(pool, 'Withdraw')

      const isClaimed = await pool.claimed(root, alice.address)
      expect(isClaimed).to.equal(true)
    })

    it('Test withdraw reverts with no claims provided', async () => {
      await expect(
        pool.connect(deployer).withdraw([], feeToken.address)
      ).to.be.revertedWith('CLAIMS_MUST_BE_PROVIDED')
    })

    it('Test withdraw reverts with root not enabled', async () => {
      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))

      await expect(
        pool.connect(alice).withdraw(
          [
            {
              root: getRoot(tree),
              score: ALICE_SCORE,
              proof,
            },
          ],
          feeToken.address
        )
      ).to.be.revertedWith('ROOT_NOT_ENABLED')
    })

    it('Test withdraw reverts with claim already made', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)

      const root = getRoot(tree)
      await pool.connect(deployer).enable(root)

      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))
      await pool.connect(alice).withdraw(
        [
          {
            root: getRoot(tree),
            score: ALICE_SCORE,
            proof,
          },
        ],
        feeToken.address
      )
      await expect(
        pool.connect(alice).withdraw(
          [
            {
              root: getRoot(tree),
              score: ALICE_SCORE,
              proof,
            },
          ],
          feeToken.address
        )
      ).to.be.revertedWith('CLAIM_ALREADY_MADE')
    })

    it('Test withdraw reverts with invalid proof', async () => {
      await feeToken.mock.transfer.returns(true)

      const root = getRoot(tree)
      await pool.connect(deployer).enable(root)

      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))

      await expect(
        pool.connect(alice).withdraw(
          [
            {
              root: getRoot(tree),
              score: BOB_SCORE,
              proof,
            },
          ],
          feeToken.address
        )
      ).to.be.revertedWith('PROOF_INVALID')
    })
  })
  describe('Test Calculate', async () => {
    it('Test calculation input and output', async () => {
      await feeToken.mock.balanceOf.returns('100000')

      const amount = await pool.calculate(ALICE_SCORE, feeToken.address)
      expect(amount).to.equal('495')
    })
  })

  describe('Test Calculate Multiple', async () => {
    it('Test calculation input and output', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken2.mock.balanceOf.returns('10000')

      const amounts = await pool.calculateMultiple(ALICE_SCORE, [
        feeToken.address,
        feeToken2.address,
      ])

      expect(amounts[0]).to.equal('495')
      expect(amounts[1]).to.equal('49')
    })
  })

  describe('Test Verify', async () => {
    it('Test verification is valid', async () => {
      const root = getRoot(tree)
      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))
      const isValid = await pool.verify(alice.address, root, ALICE_SCORE, proof)
      expect(isValid).to.be.equal(true)
    })

    it('Test verification is invalid', async () => {
      const root = getRoot(tree)
      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))
      const isValid = await pool.verify(alice.address, root, BOB_SCORE, proof)
      expect(isValid).to.be.equal(false)
    })
  })

  describe('Test setting Scale', async () => {
    it('Test setScale is successful', async () => {
      await expect(await pool.setScale(77)).to.emit(pool, 'SetScale')
      expect(await pool.scale()).to.be.equal('77')
    })

    it('Test setScale reverts', async () => {
      await expect(pool.setScale(1000)).to.be.revertedWith('SCALE_TOO_HIGH')
    })
  })

  describe('Test setting Max', async () => {
    it('Test setMax is successful', async () => {
      await expect(await pool.setMax(10)).to.emit(pool, 'SetMax')
      expect(await pool.scale()).to.be.equal('10')
    })

    it('Test setMax reverts', async () => {
      await expect(pool.setMax(101)).to.be.revertedWith('MAX_TOO_HIGH')
    })
  })

  describe('Test drain to', async () => {
    it('Test drain to is successful', async () => {
      await feeToken.mock.balanceOf.returns('10')
      await feeToken.mock.transfer.returns(true)
      await feeToken2.mock.balanceOf.returns('10')
      await feeToken2.mock.transfer.returns(true)

      await expect(
        await pool
          .connect(deployer)
          .drainTo([feeToken.address, feeToken2.address], carol.address)
      ).to.emit(pool, 'DrainTo')
    })

    it('Test dtain to is only callable by owner', async () => {
      await expect(
        pool
          .connect(alice)
          .drainTo([feeToken.address, feeToken2.address], carol.address)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })
  })
})
