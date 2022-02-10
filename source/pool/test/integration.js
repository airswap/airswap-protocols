const { expect } = require('chai')
const { toAtomicString } = require('@airswap/utils')
const { createClaim, createClaimSignature } = require('@airswap/utils')

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

  const CHAIN_ID = 31337
  const CLAIM_SCALE = 10
  const CLAIM_MAX = 50

  const ALICE_SCORE = toWei(10000, 4)
  const BOB_SCORE = toWei(100000, 4)

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
  })

  describe('Test withdraw', async () => {
    it('withdraw success', async () => {
      const claim = await createUnsignedClaim({})

      const claimSignature = await createClaimSignature(
        claim,
        deployer,
        pool.address,
        CHAIN_ID
      )
      await expect(
        await pool
          .connect(alice)
          .withdraw(
            feeToken.address,
            claim.nonce,
            claim.expiry,
            ALICE_SCORE,
            claimSignature.v,
            claimSignature.r,
            claimSignature.s
          )
      ).to.emit(pool, 'Withdraw')

      const isClaimed = await pool.nonceUsed(alice.address, claim.nonce)
      expect(isClaimed).to.equal(true)
    })

    it('withdraw success with claims by different participants', async () => {
      const nonce = 1

      const block = await ethers.provider.getBlock()
      const expiry = block.timestamp + 60

      const claimAlice = await createUnsignedClaim({
        nonce: nonce,
        expiry: expiry,
      })
      const claimAliceSignature = await createClaimSignature(
        claimAlice,
        deployer,
        pool.address,
        CHAIN_ID
      )

      const participant = bob.address
      const claimBob = await createUnsignedClaim({
        participant: participant,
        score: BOB_SCORE,
        nonce: nonce,
        expiry: expiry,
      })
      const claimBobSignature = await createClaimSignature(
        claimBob,
        deployer,
        pool.address,
        CHAIN_ID
      )

      await expect(
        pool
          .connect(alice)
          .withdraw(
            feeToken.address,
            nonce,
            claimAlice.expiry,
            ALICE_SCORE,
            claimAliceSignature.v,
            claimAliceSignature.r,
            claimAliceSignature.s
          )
      ).to.emit(pool, 'Withdraw')

      await expect(
        pool
          .connect(bob)
          .withdraw(
            feeToken.address,
            nonce,
            claimBob.expiry,
            BOB_SCORE,
            claimBobSignature.v,
            claimBobSignature.r,
            claimBobSignature.s
          )
      ).to.emit(pool, 'Withdraw')

      expect(await pool.nonceUsed(alice.address, nonce)).to.equal(true)
      expect(await pool.nonceUsed(bob.address, nonce)).to.equal(true)
    })

    it('withdraw success with new admin', async () => {
      await pool.connect(deployer).addAdmin(carol.address)
      const claim = await createUnsignedClaim({})

      const claimSignature = await createClaimSignature(
        claim,
        carol,
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
            ALICE_SCORE,
            claimSignature.v,
            claimSignature.r,
            claimSignature.s
          )
      ).to.emit(pool, 'Withdraw')

      const isClaimed = await pool.nonceUsed(alice.address, claim.nonce)
      expect(isClaimed).to.equal(true)
    })

    it('withdraw reverts when admin is removed', async () => {
      await pool.connect(deployer).addAdmin(carol.address)
      const claim = await createUnsignedClaim({})

      const claimSignature = await createClaimSignature(
        claim,
        carol,
        pool.address,
        CHAIN_ID
      )
      await pool.connect(deployer).removeAdmin(carol.address)
      await expect(
        pool
          .connect(alice)
          .withdraw(
            feeToken.address,
            claim.nonce,
            claim.expiry,
            ALICE_SCORE,
            claimSignature.v,
            claimSignature.r,
            claimSignature.s
          )
      ).to.be.revertedWith('UNAUTHORIZED')

      const isClaimed = await pool.nonceUsed(alice.address, claim.nonce)
      expect(isClaimed).to.equal(false)
    })

    it('withdraw reverts with score of zero', async () => {
      const score = 0

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

    it('withdraw reverts with claim already made', async () => {
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
          .withdraw(
            feeToken.address,
            claim.nonce,
            claim.expiry,
            ALICE_SCORE,
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
            ALICE_SCORE,
            claimSignature.v,
            claimSignature.r,
            claimSignature.s
          )
      ).to.be.revertedWith('NONCE_ALREADY_USED')
    })

    it('withdraw reverts with expiry passed', async () => {
      const block = await ethers.provider.getBlock()
      const expiry = block.timestamp + 60

      const claim = await createUnsignedClaim({ expiry: expiry })

      const claimSignature = await createClaimSignature(
        claim,
        deployer,
        pool.address,
        CHAIN_ID
      )

      await ethers.provider.send('evm_mine', [expiry])

      await expect(
        pool
          .connect(alice)
          .withdraw(
            feeToken.address,
            claim.nonce,
            claim.expiry,
            ALICE_SCORE,
            claimSignature.v,
            claimSignature.r,
            claimSignature.s
          )
      ).to.be.revertedWith('EXPIRY_PASSED')
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
            ALICE_SCORE,
            claimSignature.v,
            claimSignature.r,
            claimSignature.s
          )
      ).to.be.revertedWith('UNAUTHORIZED')
    })

    it('withdrawWithRecipient success', async () => {
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
      const amount = await pool.calculate(ALICE_SCORE, feeToken.address)
      expect(amount).to.equal('495')
    })
  })

  describe('Test drain to', async () => {
    it('Test drain to is successful', async () => {
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
