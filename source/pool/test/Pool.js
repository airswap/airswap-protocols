const { expect } = require('chai')
const { toAtomicString, ADDRESS_ZERO } = require('@airswap/utils')
const { generateTreeFromData, getRoot, getProof } = require('@airswap/merkle')
const { soliditySha3 } = require('web3-utils')

const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')
const STAKING = require('@airswap/staking/build/contracts/Staking.sol/Staking.json')

function toWei(value, places) {
  return toAtomicString(value, places || 18)
}

describe('Pool Unit', () => {
  let deployer
  let alice
  let bob
  let stakingContract

  const TREE =
    '0x0000000000000000000000000000000000000000000000000000000000000000'
  const NEW_TREE =
    '0x0000000000000000000000000000000000000000000000000000000000000001'

  const CLAIM_SCALE = 10
  const CLAIM_MAX = 50

  const ALICE_SCORE = toWei(10000, 4)
  const BOB_SCORE = toWei(100000, 4)
  const CAROL_SCORE = toWei(1000000, 4)

  const BOB_NEW_SCORE = toWei(200000, 4)

  const WITHDRAW_MINIMUM = 0

  let tree
  let newTree
  let score
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

    feeToken = await deployMockContract(deployer, IERC20.abi)
    await feeToken.mock.approve.returns(true)
    await feeToken.mock.allowance.returns(0)
    feeToken2 = await deployMockContract(deployer, IERC20.abi)
    await feeToken2.mock.approve.returns(true)
    await feeToken2.mock.allowance.returns(0)

    stakingContract = await (
      await ethers.getContractFactory(STAKING.abi, STAKING.bytecode)
    ).deploy('StakedAST', 'sAST', feeToken.address, 100, 10)
    await stakingContract.deployed()

    pool = await (
      await ethers.getContractFactory('Pool')
    ).deploy(CLAIM_SCALE, CLAIM_MAX)
    await pool.deployed()

    tree = generateTreeFromData({
      [alice.address]: ALICE_SCORE,
      [bob.address]: BOB_SCORE,
      [carol.address]: CAROL_SCORE,
    })

    newTree = generateTreeFromData({
      [alice.address]: ALICE_SCORE,
      [bob.address]: BOB_NEW_SCORE,
      [carol.address]: CAROL_SCORE,
    })
  })

  describe('constructor', async () => {
    it('constructor sets values', async () => {
      const storedScale = await pool.scale()
      const storedMax = await pool.max()
      expect(storedScale).to.equal(CLAIM_SCALE)
      expect(storedMax).to.equal(CLAIM_MAX)
    })

    it('constructor reverts when percentage is too high', async () => {
      const max = 101
      await expect(
        (await ethers.getContractFactory('Pool')).deploy(CLAIM_SCALE, max)
      )
        .to.be.revertedWith('MaxTooHigh')
        .withArgs(max)
    })

    it('constructor reverts when scale is too high', async () => {
      const scale = 78
      await expect(
        (await ethers.getContractFactory('Pool')).deploy(scale, CLAIM_MAX)
      )
        .to.be.revertedWith('ScaleTooHigh')
        .withArgs(scale)
    })

    it('constructor reverts when missing an argument', async () => {
      await expect((await ethers.getContractFactory('Pool')).deploy(CLAIM_MAX))
        .to.be.reverted
    })
  })

  describe('admin functions', async () => {
    it('enable a claim for a merkle root suceeds', async () => {
      const root = getRoot(tree)
      await pool.setAdmin(alice.address)
      expect(await pool.connect(alice).enable(TREE, root)).to.emit(
        pool,
        'Enable'
      )
    })

    it('enable a claim for a merkle root fails when not admin', async () => {
      const root = getRoot(tree)
      await expect(pool.connect(bob).enable(TREE, root)).to.be.revertedWith(
        'Unauthorized'
      )
    })

    it('enable a with the same tree overrwrites the previous root', async () => {
      const root = getRoot(tree)
      await pool.setAdmin(alice.address)
      await pool.connect(alice).enable(TREE, root)
      const newRoot = getRoot(newTree)
      await expect(pool.connect(alice).enable(TREE, newRoot)).to.be.emit(
        pool,
        'Enable'
      )
    })
  })

  describe('withdraw', async () => {
    it('withdraw success', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)

      await pool.setAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(TREE, root)
      const proof = getProof(tree, soliditySha3(bob.address, BOB_SCORE))

      await expect(
        pool.connect(bob).withdraw(
          [
            {
              tree: TREE,
              value: BOB_SCORE,
              proof,
            },
          ],
          feeToken.address,
          WITHDRAW_MINIMUM,
          bob.address
        )
      ).to.emit(pool, 'Withdraw')

      const isClaimed = await pool.claimed(TREE, bob.address)
      expect(isClaimed).to.equal(true)
    })

    it('withdraw reverts with no claim provided', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)

      await pool.setAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(TREE, root)

      await expect(
        pool
          .connect(bob)
          .withdraw([], feeToken.address, WITHDRAW_MINIMUM, bob.address)
      ).to.be.revertedWith('ClaimsNotProvided')

      const isClaimed = await pool.claimed(TREE, bob.address)
      expect(isClaimed).to.equal(false)
    })

    it('withdraw reverts with no root enabled', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)

      await pool.setAdmin(alice.address)
      const proof = getProof(tree, soliditySha3(bob.address, BOB_SCORE))

      await expect(
        pool.connect(bob).withdraw(
          [
            {
              tree: TREE,
              value: BOB_SCORE,
              proof,
            },
          ],
          feeToken.address,
          WITHDRAW_MINIMUM,
          bob.address
        )
      )
        .to.be.revertedWith('TreeNotEnabled')
        .withArgs(TREE)

      const isClaimed = await pool.claimed(TREE, bob.address)
      expect(isClaimed).to.equal(false)
    })

    it('withdraw reverts with claim already made', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)

      await pool.setAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(TREE, root)
      const proof = getProof(tree, soliditySha3(bob.address, BOB_SCORE))

      await expect(
        pool.connect(bob).withdraw(
          [
            {
              tree: TREE,
              value: BOB_SCORE,
              proof,
            },
          ],
          feeToken.address,
          WITHDRAW_MINIMUM,
          bob.address
        )
      ).to.emit(pool, 'Withdraw')

      await expect(
        pool.connect(bob).withdraw(
          [
            {
              tree: TREE,
              value: BOB_SCORE,
              proof,
            },
          ],
          feeToken.address,
          WITHDRAW_MINIMUM,
          bob.address
        )
      ).to.be.revertedWith('ClaimAlreadyUsed')

      const isClaimed = await pool.claimed(TREE, bob.address)
      expect(isClaimed).to.equal(true)
    })

    it('withdraw reverts with score of zero', async () => {
      score = 0

      await pool.setAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(TREE, root)
      const proof = getProof(tree, soliditySha3(bob.address, BOB_SCORE))

      await expect(
        pool.connect(bob).withdraw(
          [
            {
              tree: TREE,
              value: score,
              proof,
            },
          ],
          feeToken.address,
          WITHDRAW_MINIMUM,
          bob.address
        )
      )
        .to.be.revertedWith('ProofInvalid')
        .withArgs(TREE, root)

      const isClaimed = await pool.claimed(TREE, bob.address)
      expect(isClaimed).to.equal(false)
    })

    it('withdraw reverts with minimum not met', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      ;(await feeToken.mock.transfer.returns(true)) -
        (await pool.setAdmin(alice.address))
      const root = getRoot(tree)
      await pool.connect(alice).enable(TREE, root)
      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))
      const withdrawMinimum = 496

      const amount = await pool
        .connect(alice)
        .calculate(ALICE_SCORE, feeToken.address)

      await expect(
        pool.connect(alice).withdraw(
          [
            {
              tree: TREE,
              value: ALICE_SCORE,
              proof,
            },
          ],
          feeToken.address,
          withdrawMinimum,
          bob.address
        )
      )
        .to.be.revertedWith('AmountInsufficient')
        .withArgs(amount)

      const isClaimed = await pool.claimed(TREE, alice.address)
      expect(isClaimed).to.equal(false)
    })

    it('withdraw marks tree for address as claimed', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)

      await pool.setAdmin(alice.address)
      const root = getRoot(tree)
      const newRoot = getRoot(newTree)
      await pool.connect(alice).enable(TREE, root)
      await pool.connect(alice).enable(NEW_TREE, newRoot)
      const proof = getProof(tree, soliditySha3(bob.address, BOB_SCORE))

      await pool.connect(bob).withdraw(
        [
          {
            tree: TREE,
            value: BOB_SCORE,
            proof,
          },
        ],
        feeToken.address,
        WITHDRAW_MINIMUM,
        bob.address
      )

      const isClaimed = await pool.getStatus(bob.address, [TREE, NEW_TREE])
      expect(await isClaimed[0]).to.equal(true)
      expect(await isClaimed[1]).to.equal(false)
    })
  })

  describe('Calculate', async () => {
    it('calculation input and output', async () => {
      await feeToken.mock.balanceOf.returns('100000')

      const amount = await pool.calculate(ALICE_SCORE, feeToken.address)
      expect(amount).to.equal('495')
    })
  })

  describe('Verify', async () => {
    it('verification is valid', async () => {
      await pool.setAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(TREE, root)
      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))

      const isValid = await pool.verify(alice.address, root, ALICE_SCORE, proof)
      expect(isValid).to.be.equal(true)
    })

    it('verification is invalid with wrong participant', async () => {
      await pool.setAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(TREE, root)
      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))

      const isValid = await pool.verify(bob.address, root, ALICE_SCORE, proof)
      expect(isValid).to.be.equal(false)
    })

    it('verification is invalid with wrong scroe', async () => {
      await pool.setAdmin(alice.address)
      const root = getRoot(tree)
      await pool.connect(alice).enable(TREE, root)
      const proof = getProof(tree, soliditySha3(alice.address, ALICE_SCORE))

      const isValid = await pool.verify(alice.address, root, BOB_SCORE, proof)
      expect(isValid).to.be.equal(false)
    })
  })

  describe('setting Scale', async () => {
    it('setScale is successful', async () => {
      const scale = 77
      await expect(pool.setScale(scale)).to.emit(pool, 'SetScale')
      expect(await pool.scale()).to.be.equal(`${scale}`)
    })

    it('setScale reverts when not owner', async () => {
      const scale = 77
      await expect(pool.connect(alice).setScale(scale)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
    })

    it('setScale reverts', async () => {
      const scale = 1000
      await expect(pool.setScale(scale))
        .to.be.revertedWith('ScaleTooHigh')
        .withArgs(scale)
    })
  })

  describe('setting Max', async () => {
    it('setMax is successful', async () => {
      const max = 10
      await expect(pool.setMax(max)).to.emit(pool, 'SetMax')
      expect(await pool.scale()).to.be.equal(`${max}`)
    })

    it('setMax reverts when not owner', async () => {
      const max = 10
      await expect(pool.connect(alice).setMax(max)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      )
    })

    it('setMax reverts', async () => {
      const max = 101
      await expect(pool.setMax(max))
        .to.be.revertedWith('MaxTooHigh')
        .withArgs(max)
    })
  })

  describe('setting admin', async () => {
    it('setAdmin is successful', async () => {
      await expect(pool.setAdmin(alice.address)).to.emit(pool, 'SetAdmin')
      expect(await pool.admins(alice.address)).to.be.equal(true)
    })

    it('setAdmin reverts', async () => {
      await expect(
        pool.connect(alice).setAdmin(alice.address)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('setAdmin reverts with zero address', async () => {
      await expect(pool.connect(deployer).setAdmin(ADDRESS_ZERO))
        .to.be.revertedWith('AddressInvalid')
        .withArgs(ADDRESS_ZERO)
    })

    it('unsetAdmin is successful', async () => {
      await expect(pool.setAdmin(alice.address)).to.emit(pool, 'SetAdmin')
      await expect(pool.unsetAdmin(alice.address)).to.emit(pool, 'UnsetAdmin')
      expect(await pool.admins(alice.address)).to.be.equal(false)
    })

    it('unsetAdmin reverts', async () => {
      await expect(pool.setAdmin(alice.address)).to.emit(pool, 'SetAdmin')
      await expect(
        pool.connect(alice).unsetAdmin(alice.address)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('unsetAdmin executed by non-admin reverts', async () => {
      await expect(pool.connect(deployer).unsetAdmin(alice.address))
        .to.be.revertedWith('AdminNotSet')
        .withArgs(alice.address)
    })
  })

  describe('migration functions', async () => {
    it('set claimed as owner is successful', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await await pool.connect(deployer).setAdmin(alice.address)

      const root = getRoot(tree)
      await pool.connect(alice).enableAndSetClaimed(TREE, root, [bob.address])

      const proof = getProof(tree, soliditySha3(bob.address, BOB_SCORE))
      await expect(
        pool.connect(bob).withdraw(
          [
            {
              tree: TREE,
              value: BOB_SCORE,
              proof,
            },
          ],
          feeToken.address,
          WITHDRAW_MINIMUM,
          bob.address
        )
      ).to.be.revertedWith('ClaimAlreadyUsed')
    })

    it('set claimed with non-owner reverts', async () => {
      await feeToken.mock.balanceOf.returns('100000')

      const root = getRoot(tree)
      await expect(
        pool.connect(bob).enableAndSetClaimed(TREE, root, [bob.address])
      ).to.be.revertedWith('Unauthorized')
    })

    it('drain to is successful', async () => {
      await feeToken.mock.balanceOf.returns('10')
      await feeToken.mock.transfer.returns(true)
      await feeToken2.mock.balanceOf.returns('10')
      await feeToken2.mock.transfer.returns(true)

      await expect(
        pool
          .connect(deployer)
          .drainTo([feeToken.address, feeToken2.address], carol.address)
      ).to.emit(pool, 'DrainTo')
    })

    it('drain to is only callable by owner', async () => {
      await expect(
        pool
          .connect(alice)
          .drainTo([feeToken.address, feeToken2.address], carol.address)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })
  })
})
