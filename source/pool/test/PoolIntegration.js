const { expect } = require('chai')
const { toAtomicString } = require('@airswap/utils')
const { generateTreeFromData, getRoot, getProof } = require('@airswap/merkle')
const { soliditySha3 } = require('web3-utils')

const { ethers } = require('hardhat')
const ERC20PresetFixedSupply = require('@openzeppelin/contracts/build/contracts/ERC20PresetFixedSupply.json')
const STAKING = require('@airswap/staking/build/contracts/Staking.sol/Staking.json')

function toWei(value, places) {
  return toAtomicString(value, places || 18)
}

describe('Pool Integration', () => {
  let deployer
  let alice
  let bob
  let stakingContract

  const GROUP_ID =
    '0x0000000000000000000000000000000000000000000000000000000000000000'

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

    feeToken = await (
      await ethers.getContractFactory(
        ERC20PresetFixedSupply.abi,
        ERC20PresetFixedSupply.bytecode
      )
    ).deploy('TestERC20', 'TERC20', '10000', pool.address)
    await feeToken.deployed()
    feeToken2 = await (
      await ethers.getContractFactory(
        ERC20PresetFixedSupply.abi,
        ERC20PresetFixedSupply.bytecode
      )
    ).deploy('TestERC20_2', 'TERC20_2', '10000', pool.address)
    await feeToken2.deployed()

    stakingContract = await (
      await ethers.getContractFactory(STAKING.abi, STAKING.bytecode)
    ).deploy('StakedAST', 'sAST', feeToken.address, 100, 10)
    await stakingContract.deployed()

    await pool.setStaking(feeToken.address, stakingContract.address)
    await pool.addAdmin(deployer.address)

    tree = generateTreeFromData({
      [alice.address]: ALICE_SCORE,
      [bob.address]: BOB_SCORE,
      [carol.address]: CAROL_SCORE,
    })
  })

  describe('update allowances when update staking contract', async () => {
    it('set has an allowance for the current feeToken contract', async () => {
      expect(
        await feeToken.allowance(pool.address, stakingContract.address)
      ).to.equal(
        '115792089237316195423570985008687907853269984665640564039457584007913129639935'
      )
    })

    it('set a new staking contract and update allowances', async () => {
      newStakingContract = await (
        await ethers.getContractFactory(STAKING.abi, STAKING.bytecode)
      ).deploy('StakedAST', 'sAST', feeToken.address, 100, 10)
      await stakingContract.deployed()

      await pool
        .connect(deployer)
        .setStaking(feeToken2.address, newStakingContract.address)
      expect(await pool.stakingContract()).to.equal(newStakingContract.address)
      expect(await pool.stakingToken()).to.equal(feeToken2.address)

      expect(
        await feeToken
          .connect(deployer)
          .allowance(pool.address, stakingContract.address)
      ).to.equal(0)

      expect(
        await feeToken2.allowance(pool.address, newStakingContract.address)
      ).to.equal(
        '115792089237316195423570985008687907853269984665640564039457584007913129639935'
      )
    })
  })

  describe('withdraw increase the staker balance', async () => {
    it('transfers the claimed funds to the staker', async () => {
      const root = getRoot(tree)
      expect(await pool.connect(deployer).enable(GROUP_ID, root)).to.emit(
        pool,
        'Enable'
      )
      const proof = getProof(tree, soliditySha3(bob.address, BOB_SCORE))
      await pool.connect(bob).withdraw(
        [
          {
            groupId: GROUP_ID,
            score: BOB_SCORE,
            proof,
          },
        ],
        feeToken.address
      )
      await expect(await feeToken.balanceOf(bob.address)).to.be.equal('454')
      const isClaimed = await pool.claimed(GROUP_ID, bob.address)
      expect(isClaimed).to.equal(true)
    })
  })

  describe('withdraw for increase the balance of the recipient', async () => {
    it('transfers the claimed funds to the staker', async () => {
      const root = getRoot(tree)
      expect(await pool.connect(deployer).enable(GROUP_ID, root)).to.emit(
        pool,
        'Enable'
      )
      const proof = getProof(tree, soliditySha3(bob.address, BOB_SCORE))
      await pool.connect(bob).withdrawWithRecipient(
        [
          {
            groupId: GROUP_ID,
            score: BOB_SCORE,
            proof,
          },
        ],
        feeToken.address,
        0,
        alice.address
      )
      await expect(await feeToken.balanceOf(alice.address)).to.be.equal('454')
      const isClaimed = await pool.claimed(GROUP_ID, bob.address)
      expect(isClaimed).to.equal(true)
    })
  })

  describe('withdraw and stake for', async () => {
    it('transfers the claimed funds to the staker', async () => {
      const root = getRoot(tree)
      expect(await pool.connect(deployer).enable(GROUP_ID, root)).to.emit(
        pool,
        'Enable'
      )
      const proof = getProof(tree, soliditySha3(bob.address, BOB_SCORE))
      await pool.connect(bob).withdrawAndStakeFor(
        [
          {
            groupId: GROUP_ID,
            score: BOB_SCORE,
            proof,
          },
        ],
        feeToken.address,
        0,
        bob.address
      )
      await expect(await stakingContract.balanceOf(bob.address)).to.be.equal(
        '454'
      )
      const isClaimed = await pool.claimed(GROUP_ID, bob.address)
      expect(isClaimed).to.equal(true)
    })
  })
})
