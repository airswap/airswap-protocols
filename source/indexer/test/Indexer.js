const { expect } = require('chai')
const { toAtomicString } = require('@airswap/utils')
const { generateTreeFromData, getRoot, getProof } = require('@airswap/merkle')
const { soliditySha3 } = require('web3-utils')

const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')
const STAKING = require('@airswap/staking/build/contracts/Staking.sol/Staking.json')
const { ADDRESS_ZERO } = require('@airswap/constants')

function toWei(value, places) {
  return toAtomicString(value, places || 18)
}

describe('Pool Unit', () => {
  let deployer
  let alice
  let bob

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
  })
})
