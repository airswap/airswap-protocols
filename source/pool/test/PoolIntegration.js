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

  const TREE_ID =
    '0x0000000000000000000000000000000000000000000000000000000000000000'

  const CLAIM_SCALE = 10
  const CLAIM_MAX = 50

  const ALICE_SCORE = toWei(10000, 4)
  const BOB_SCORE = toWei(100000, 4)
  const CAROL_SCORE = toWei(1000000, 4)

  const WITHDRAW_MINIMUM = 0

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

    await pool.setAdmin(deployer.address)

    tree = generateTreeFromData({
      [alice.address]: ALICE_SCORE,
      [bob.address]: BOB_SCORE,
      [carol.address]: CAROL_SCORE,
    })
  })

  describe('withdraw increase the staker balance', async () => {
    it('transfers the claimed funds to the staker', async () => {
      const root = getRoot(tree)
      expect(await pool.connect(deployer).enable(TREE_ID, root)).to.emit(
        pool,
        'Enable'
      )
      const proof = getProof(tree, soliditySha3(bob.address, BOB_SCORE))
      await pool.connect(bob).withdraw(
        [
          {
            tree: TREE_ID,
            value: BOB_SCORE,
            proof,
          },
        ],
        feeToken.address,
        WITHDRAW_MINIMUM,
        bob.address
      )
      await expect(await feeToken.balanceOf(bob.address)).to.be.equal('454')
      const isClaimed = await pool.claimed(TREE_ID, bob.address)
      expect(isClaimed).to.equal(true)
    })
  })
})
