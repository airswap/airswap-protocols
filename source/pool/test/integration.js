const { expect } = require('chai')
const { soliditySha3 } = require('web3-utils')
const { toAtomicString } = require('@airswap/utils')
const { generateTreeFromData, getRoot, getProof } = require('@airswap/merkle')

const { ethers } = require('hardhat')
const ERC20 = require('@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json')
const STAKING = require('@airswap/staking/build/contracts/Staking.sol/Staking.json')

function toWei(value, places) {
  return toAtomicString(value, places || 18)
}

describe('Pool Integration Tests', () => {
  let deployer
  let alice
  let bob
  let carol
  let stakeContract

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

    feeToken = await (
      await ethers.getContractFactory(ERC20.abi, ERC20.bytecode)
    ).deploy('A', 'A')
    await feeToken.deployed()

    feeToken2 = await (
      await ethers.getContractFactory(ERC20.abi, ERC20.bytecode)
    ).deploy('B', 'B')
    await feeToken2.deployed()

    stakeContract = await (
      await ethers.getContractFactory(STAKING.abi, STAKING.bytecode)
    ).deploy(feeToken.address, 'StakedAST', 'sAST', 100, 1)
    await stakeContract.deployed()

    pool = await (
      await ethers.getContractFactory('Pool')
    ).deploy(CLAIM_SCALE, CLAIM_MAX, stakeContract.address, feeToken.address)
    await pool.deployed()

    feeToken.mint(pool.address, 100000)
    feeToken2.mint(pool.address, 10000)

    tree = generateTreeFromData({
      [alice.address]: ALICE_SCORE,
      [bob.address]: BOB_SCORE,
      [carol.address]: CAROL_SCORE,
    })
  })

  describe('Test withdraw', async () => {
    it('withdraw success', async () => {
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

    it('withdraw reverts with no claims provided', async () => {
      await expect(
        pool.connect(deployer).withdraw([], feeToken.address)
      ).to.be.revertedWith('CLAIMS_MUST_BE_PROVIDED')
    })

    it('withdraw reverts with root not enabled', async () => {
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

    it('withdraw reverts with claim already made', async () => {
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

    it('withdrawWithRecipient success', async () => {
      const root = getRoot(tree)
      await pool.connect(deployer).enable(root)

      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))
      const withdrawMinimum = 0
      await expect(
        await pool.connect(alice).withdrawWithRecipient(
          [
            {
              root: getRoot(tree),
              score: ALICE_SCORE,
              proof,
            },
          ],
          feeToken.address,
          withdrawMinimum,
          bob.address
        )
      ).to.emit(pool, 'Withdraw')

      const isClaimed = await pool.claimed(root, alice.address)
      expect(isClaimed).to.equal(true)
    })

    it('withdrawWithRecipient reverts with minimumAmount not met', async () => {
      const root = getRoot(tree)
      await pool.connect(deployer).enable(root)

      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))
      const withdrawMinimum = 496

      await expect(
        pool.connect(alice).withdrawWithRecipient(
          [
            {
              root: getRoot(tree),
              score: ALICE_SCORE,
              proof,
            },
          ],
          feeToken.address,
          withdrawMinimum,
          bob.address
        )
      ).to.be.revertedWith('INSUFFICIENT_AMOUNT')
    })

    it('withdrawAndStake success', async () => {
      const root = getRoot(tree)
      await pool.connect(deployer).enable(root)

      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))
      const withdrawMinimum = 0
      await expect(
        pool.connect(alice).withdrawAndStake(
          [
            {
              root: getRoot(tree),
              score: ALICE_SCORE,
              proof,
            },
          ],
          feeToken.address,
          withdrawMinimum
        )
      ).to.emit(pool, 'Withdraw')
      const isClaimed = await pool.claimed(root, alice.address)
      expect(isClaimed).to.equal(true)

      const balance = await stakeContract
        .connect(alice)
        .balanceOf(alice.address)
      expect(balance).to.equal('495')
    })

    it('withdrawAndStake reverts with wrong token', async () => {
      const root = getRoot(tree)
      await pool.connect(deployer).enable(root)

      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))
      const withdrawMinimum = 0
      await expect(
        pool.connect(alice).withdrawAndStake(
          [
            {
              root: getRoot(tree),
              score: ALICE_SCORE,
              proof,
            },
          ],
          feeToken2.address,
          withdrawMinimum
        )
      ).to.be.revertedWith('INVALID_TOKEN')
    })

    it('withdrawAndStakeFor success', async () => {
      const root = getRoot(tree)
      await pool.connect(deployer).enable(root)

      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))
      const withdrawMinimum = 0
      await expect(
        await pool.connect(alice).withdrawAndStakeFor(
          [
            {
              root: getRoot(tree),
              score: ALICE_SCORE,
              proof,
            },
          ],
          feeToken.address,
          withdrawMinimum,
          bob.address
        )
      ).to.emit(pool, 'Withdraw')

      const isClaimed = await pool.claimed(root, alice.address)
      expect(isClaimed).to.equal(true)

      const balance = await stakeContract.connect(bob).balanceOf(bob.address)
      expect(balance).to.equal('495')
    })

    it('withdrawAndStakeFor reverts with wrong token', async () => {
      const root = getRoot(tree)
      await pool.connect(deployer).enable(root)

      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))
      const withdrawMinimum = 0
      await expect(
        pool.connect(alice).withdrawAndStakeFor(
          [
            {
              root: getRoot(tree),
              score: ALICE_SCORE,
              proof,
            },
          ],
          feeToken2.address,
          withdrawMinimum,
          bob.address
        )
      ).to.be.revertedWith('INVALID_TOKEN')
    })
  })

  describe('Test Calculate', async () => {
    it('Test calculation input and output', async () => {
      const amount = await pool.calculate(ALICE_SCORE, feeToken.address)
      expect(amount).to.equal('495')
    })
  })

  describe('Test Calculate Multiple', async () => {
    it('Test calculation input and output', async () => {
      const amounts = await pool.calculateMultiple(ALICE_SCORE, [
        feeToken.address,
        feeToken2.address,
      ])

      expect(amounts[0]).to.equal('495')
      expect(amounts[1]).to.equal('49')
    })
  })

  describe('Test drain to', async () => {
    it('Test drain to is successful', async () => {
      await expect(
        await pool
          .connect(deployer)
          .drainTo([feeToken.address, feeToken2.address], carol.address)
      ).to.emit(pool, 'DrainTo')
    })

    it('Test drain to is only callable by owner', async () => {
      await expect(
        pool
          .connect(alice)
          .drainTo([feeToken.address, feeToken2.address], carol.address)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })
  })
})
