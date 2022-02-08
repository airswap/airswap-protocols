const { expect } = require('chai')
const { toAtomicString } = require('@airswap/utils')
const { createClaim, createClaimSignature } = require('@airswap/utils')

const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')
const STAKING = require('@airswap/staking/build/contracts/Staking.sol/Staking.json')
const { ADDRESS_ZERO } = require('@airswap/constants')

function toWei(value, places) {
  return toAtomicString(value, places || 18)
}

describe('Pool Unit Tests', () => {
  let deployer
  let alice
  let bob
  let stakeContract

  const CHAIN_ID = 31337
  const CLAIM_SCALE = 10
  const CLAIM_MAX = 50

  const ALICE_SCORE = toWei(10000, 4)
  const BOB_SCORE = toWei(100000, 4)

  let nonce
  let score
  let feeToken
  let feeToken2
  let pool
  let snapshotId

  async function createUnsignedClaim(params) {
    const unsignedClaim = createClaim({
      participant: alice.address,
      score: ALICE_SCORE,
      ...params,
    })
    return unsignedClaim
  }

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

    stakeContract = await (
      await ethers.getContractFactory(STAKING.abi, STAKING.bytecode)
    ).deploy(feeToken.address, 'StakedAST', 'sAST', 100, 10)
    await stakeContract.deployed()

    pool = await (
      await ethers.getContractFactory('Pool')
    ).deploy(CLAIM_SCALE, CLAIM_MAX, stakeContract.address, feeToken.address)
    await pool.deployed()
  })

  describe('Test constructor', async () => {
    it('constructor sets values', async () => {
      const storedScale = await pool.scale()
      const storedMax = await pool.max()
      const stakingContract = await pool.stakingContract()
      const stakingToken = await pool.stakingToken()
      const adminOwner = await pool.admins(deployer.address)
      expect(storedScale).to.equal(CLAIM_SCALE)
      expect(storedMax).to.equal(CLAIM_MAX)
      expect(stakingContract).to.equal(stakeContract.address)
      expect(stakingToken).to.equal(feeToken.address)
      expect(adminOwner).to.equal(true)
    })

    it('constructor reverts when percentage is too high', async () => {
      await expect(
        (
          await ethers.getContractFactory('Pool')
        ).deploy(CLAIM_SCALE, 101, stakeContract.address, feeToken.address)
      ).to.be.revertedWith('MAX_TOO_HIGH')
    })

    it('constructor reverts when scale is too high', async () => {
      await expect(
        (
          await ethers.getContractFactory('Pool')
        ).deploy(78, CLAIM_MAX, stakeContract.address, feeToken.address)
      ).to.be.revertedWith('SCALE_TOO_HIGH')
    })
  })

  describe('Test staking variables', async () => {
    it('set stake contract successful', async () => {
      await pool.connect(deployer).setStakingContract(stakeContract.address)
      expect(await pool.stakingContract()).to.equal(stakeContract.address)
    })

    it('set stake contract reverts', async () => {
      await expect(
        pool.connect(deployer).setStakingContract(ADDRESS_ZERO)
      ).to.be.revertedWith('INVALID_ADDRESS')
    })

    it('set stake token successful', async () => {
      await feeToken2.mock.approve.returns(true)
      await feeToken2.mock.allowance.returns(0)
      await pool.connect(deployer).setStakingToken(feeToken2.address)
      expect(await pool.stakingToken()).to.equal(feeToken2.address)
    })

    it('set stake token reverts', async () => {
      await expect(
        pool.connect(deployer).setStakingToken(ADDRESS_ZERO)
      ).to.be.revertedWith('INVALID_ADDRESS')
    })
  })

  describe('Test withdraw', async () => {
    it('withdraw success', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)

      nonce = 1

      const block = await ethers.provider.getBlock()
      const expiry = block.timestamp + 60

      const claim = await createUnsignedClaim({ nonce: nonce, expiry: expiry })

      const claimSignature = await createClaimSignature(
        claim,
        deployer,
        pool.address,
        CHAIN_ID
      )

      await expect(
        pool
          .connect(alice)
          .withdraw(
            feeToken.address,
            claim.nonce,
            claim.expiry,
            claim.score,
            claimSignature.v,
            claimSignature.r,
            claimSignature.s
          )
      ).to.emit(pool, 'Withdraw')

      const isClaimed = await pool.nonceUsed(alice.address, nonce)
      expect(isClaimed).to.equal(true)
    })

    it('withdraw reverts with claim already made', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)

      nonce = 1

      const block = await ethers.provider.getBlock()
      const expiry = block.timestamp + 60

      const claim = await createUnsignedClaim({ nonce: nonce, expiry: expiry })

      const claimSignature = await createClaimSignature(
        claim,
        deployer,
        pool.address,
        CHAIN_ID
      )

      await expect(
        pool
          .connect(alice)
          .withdraw(
            feeToken.address,
            claim.nonce,
            claim.expiry,
            claim.score,
            claimSignature.v,
            claimSignature.r,
            claimSignature.s
          )
      ).to.emit(pool, 'Withdraw')

      await expect(
        pool
          .connect(alice)
          .withdraw(
            feeToken.address,
            claim.nonce,
            claim.expiry,
            claim.score,
            claimSignature.v,
            claimSignature.r,
            claimSignature.s
          )
      ).to.be.revertedWith('NONCE_ALREADY_USED')
    })

    it('withdraw reverts with score of zero', async () => {
      score = 0

      const claim = await createUnsignedClaim({ score: score })

      const claimSignature = await createClaimSignature(
        claim,
        deployer,
        pool.address,
        CHAIN_ID
      )

      await expect(
        pool
          .connect(alice)
          .withdraw(
            feeToken.address,
            claim.nonce,
            claim.expiry,
            claim.score,
            claimSignature.v,
            claimSignature.r,
            claimSignature.s
          )
      ).to.be.revertedWith('SCORE_MUST_BE_PROVIDED')
    })

    it('withdraw reverts with invalid signatory signing', async () => {
      const claim = await createUnsignedClaim({})

      const claimSignature = await createClaimSignature(
        claim,
        bob,
        pool.address,
        CHAIN_ID
      )

      await expect(
        pool
          .connect(alice)
          .withdraw(
            feeToken.address,
            claim.nonce,
            claim.expiry,
            claim.score,
            claimSignature.v,
            claimSignature.r,
            claimSignature.s
          )
      ).to.be.revertedWith('UNAUTHORIZED')
    })

    it('withdraw reverts with invalid participant claiming', async () => {
      const claim = await createUnsignedClaim({})

      const claimSignature = await createClaimSignature(
        claim,
        deployer,
        pool.address,
        CHAIN_ID
      )

      await expect(
        pool
          .connect(bob)
          .withdraw(
            feeToken.address,
            claim.nonce,
            claim.expiry,
            claim.score,
            claimSignature.v,
            claimSignature.r,
            claimSignature.s
          )
      ).to.be.revertedWith('UNAUTHORIZED')
    })

    it('withdrawWithRecipient success', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transfer.returns(true)

      const claim = await createUnsignedClaim({})

      const claimSignature = await createClaimSignature(
        claim,
        deployer,
        pool.address,
        CHAIN_ID
      )

      const withdrawMinimum = 0
      await expect(
        pool
          .connect(alice)
          .withdrawWithRecipient(
            withdrawMinimum,
            feeToken.address,
            bob.address,
            claim.nonce,
            claim.expiry,
            claim.score,
            claimSignature.v,
            claimSignature.r,
            claimSignature.s
          )
      ).to.emit(pool, 'Withdraw')

      const isClaimed = await pool.nonceUsed(alice.address, claim.nonce)
      expect(isClaimed).to.equal(true)
    })

    it('withdrawWithRecipient reverts with minimumAmount not met', async () => {
      await feeToken.mock.balanceOf.returns('100000')

      const withdrawMinimum = 496

      const claim = await createUnsignedClaim({})

      const claimSignature = await createClaimSignature(
        claim,
        deployer,
        pool.address,
        CHAIN_ID
      )

      await expect(
        pool
          .connect(alice)
          .withdrawWithRecipient(
            withdrawMinimum,
            feeToken.address,
            bob.address,
            claim.nonce,
            claim.expiry,
            claim.score,
            claimSignature.v,
            claimSignature.r,
            claimSignature.s
          )
      ).to.be.revertedWith('INSUFFICIENT_AMOUNT')
    })

    it('withdrawAndStake success', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.transferFrom.returns(true)

      const claim = await createUnsignedClaim({})

      const claimSignature = await createClaimSignature(
        claim,
        deployer,
        pool.address,
        CHAIN_ID
      )

      const withdrawMinimum = 0
      await expect(
        pool
          .connect(alice)
          .withdrawAndStake(
            withdrawMinimum,
            feeToken.address,
            claim.nonce,
            claim.expiry,
            claim.score,
            claimSignature.v,
            claimSignature.r,
            claimSignature.s
          )
      ).to.emit(pool, 'Withdraw')

      const isClaimed = await pool.nonceUsed(alice.address, claim.nonce)
      expect(isClaimed).to.equal(true)

      const balance = await stakeContract
        .connect(alice)
        .balanceOf(alice.address)
      expect(balance).to.equal('495')
    })

    it('withdrawAndStake reverts with wrong token', async () => {
      const claim = await createUnsignedClaim({})

      const claimSignature = await createClaimSignature(
        claim,
        deployer,
        pool.address,
        CHAIN_ID
      )

      const withdrawMinimum = 0
      await expect(
        pool
          .connect(alice)
          .withdrawAndStake(
            withdrawMinimum,
            feeToken2.address,
            claim.nonce,
            claim.expiry,
            claim.score,
            claimSignature.v,
            claimSignature.r,
            claimSignature.s
          )
      ).to.be.revertedWith('INVALID_TOKEN')
    })

    it('withdrawAndStakeFor success', async () => {
      await feeToken.mock.balanceOf.returns('100000')
      await feeToken.mock.approve.returns(true)
      await feeToken.mock.allowance.returns(0)
      await feeToken.mock.transferFrom.returns(true)

      const claim = await createUnsignedClaim({})

      const claimSignature = await createClaimSignature(
        claim,
        deployer,
        pool.address,
        CHAIN_ID
      )

      const withdrawMinimum = 0
      await expect(
        pool
          .connect(alice)
          .withdrawAndStakeFor(
            withdrawMinimum,
            feeToken.address,
            bob.address,
            claim.nonce,
            claim.expiry,
            claim.score,
            claimSignature.v,
            claimSignature.r,
            claimSignature.s
          )
      ).to.emit(pool, 'Withdraw')

      const isClaimed = await pool.nonceUsed(alice.address, claim.nonce)
      expect(isClaimed).to.equal(true)

      const balance = await stakeContract.connect(bob).balanceOf(bob.address)
      expect(balance).to.equal('495')
    })

    it('withdrawAndStakeFor reverts with wrong token', async () => {
      const claim = await createUnsignedClaim({})

      const claimSignature = await createClaimSignature(
        claim,
        deployer,
        pool.address,
        CHAIN_ID
      )
      const withdrawMinimum = 0
      await expect(
        pool
          .connect(alice)
          .withdrawAndStakeFor(
            withdrawMinimum,
            feeToken2.address,
            bob.address,
            claim.nonce,
            claim.expiry,
            claim.score,
            claimSignature.v,
            claimSignature.r,
            claimSignature.s
          )
      ).to.be.revertedWith('INVALID_TOKEN')
    })
  })

  describe('Test Calculate', async () => {
    it('Test calculation input and output', async () => {
      await feeToken.mock.balanceOf.returns('100000')

      const amount = await pool.calculate(ALICE_SCORE, feeToken.address)
      expect(amount).to.equal('495')
    })
  })

  describe('Test Verify', async () => {
    it('Test verification is valid', async () => {
      const claim = await createUnsignedClaim({})

      const claimSignature = await createClaimSignature(
        claim,
        deployer,
        pool.address,
        CHAIN_ID
      )
      const isValid = await pool.verify(
        claim.nonce,
        claim.expiry,
        alice.address,
        ALICE_SCORE,
        claimSignature.v,
        claimSignature.r,
        claimSignature.s
      )
      expect(isValid).to.be.equal(true)
    })

    it('Test verification is invalid', async () => {
      const claim = await createUnsignedClaim({})

      const claimSignature = await createClaimSignature(
        claim,
        deployer,
        pool.address,
        CHAIN_ID
      )
      const isValid = await pool.verify(
        claim.nonce,
        claim.expiry,
        alice.address,
        BOB_SCORE,
        claimSignature.v,
        claimSignature.r,
        claimSignature.s
      )
      expect(isValid).to.be.equal(false)
    })

    it('Test verification fails with expiry passed', async () => {
      const claim = await createUnsignedClaim({})

      const claimSignature = await createClaimSignature(
        claim,
        deployer,
        pool.address,
        CHAIN_ID
      )

      await ethers.provider.send('evm_mine', [parseFloat(claim.expiry)])

      await expect(
        pool.verify(
          claim.nonce,
          claim.expiry,
          alice.address,
          BOB_SCORE,
          claimSignature.v,
          claimSignature.r,
          claimSignature.s
        )
      ).to.be.revertedWith('EXPIRY_PASSED')
    })
  })

  describe('Test setting Scale', async () => {
    it('Test setScale is successful', async () => {
      await expect(pool.setScale(77)).to.emit(pool, 'SetScale')
      expect(await pool.scale()).to.be.equal('77')
    })

    it('Test setScale reverts', async () => {
      await expect(pool.setScale(1000)).to.be.revertedWith('SCALE_TOO_HIGH')
    })
  })

  describe('Test setting Max', async () => {
    it('Test setMax is successful', async () => {
      await expect(pool.setMax(10)).to.emit(pool, 'SetMax')
      expect(await pool.scale()).to.be.equal('10')
    })

    it('Test setMax reverts', async () => {
      await expect(pool.setMax(101)).to.be.revertedWith('MAX_TOO_HIGH')
    })
  })

  describe('Test setting admin', async () => {
    it('Test addAdmin is successful', async () => {
      await pool.addAdmin(alice.address)
      expect(await pool.admins(alice.address)).to.be.equal(true)
    })

    it('Test addAdmin reverts', async () => {
      await expect(
        pool.connect(alice).addAdmin(alice.address)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('Test addAdmin reverts with zero address', async () => {
      await expect(
        pool.connect(deployer).addAdmin(ADDRESS_ZERO)
      ).to.be.revertedWith('INVALID_ADDRESS')
    })

    it('Test removeAdmin is successful', async () => {
      await pool.addAdmin(alice.address)
      await pool.removeAdmin(alice.address)
      expect(await pool.admins(alice.address)).to.be.equal(false)
    })

    it('Test removeAdmin reverts', async () => {
      await pool.addAdmin(alice.address)
      await expect(
        pool.connect(alice).removeAdmin(alice.address)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('Test removeAdmin executed by non-admin reverts', async () => {
      await expect(
        pool.connect(deployer).removeAdmin(alice.address)
      ).to.be.revertedWith('ADMIN_NOT_SET')
    })
  })

  describe('Test drain to', async () => {
    it('Test drain to is successful', async () => {
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

    it('Test drain to is only callable by owner', async () => {
      await expect(
        pool
          .connect(alice)
          .drainTo([feeToken.address, feeToken2.address], carol.address)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })
  })
})
