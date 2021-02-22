const { expect } = require('chai')
const timeMachine = require('ganache-time-traveler')
const { artifacts, ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = artifacts.require('IERC20')
const IERC20_Interface = new ethers.utils.Interface(IERC20.abi)

describe('Locker V2', function () {
  let snapshotId
  let deployer
  let randomUser
  let stakingToken

  beforeEach(async () => {
    const snapshot = await timeMachine.takeSnapshot()
    snapshotId = snapshot['result']
  })

  afterEach(async () => {
    await timeMachine.revertToSnapshot(snapshotId)
  })

  before(async () => {
    [deployer, randomUser] = await ethers.getSigners()
    stakingToken = await deployMockContract(deployer, IERC20.abi)
  })

  it('test constructor sets default values', async function () {
    const LockerFactory = await ethers.getContractFactory('LockerV2')
    const locker = await LockerFactory.deploy(stakingToken.address, 5, 2, 10)
    await locker.deployed()
    const owner = await locker.owner()
    const tokenAddress = await locker.stakingToken()
    const cliff = await locker.cliff()
    const periodLength = await locker.periodLength()
    const percentPerPeriod = await locker.percentPerPeriod()

    expect(owner).to.equal(deployer.address)
    expect(tokenAddress).to.equal(stakingToken.address)
    expect(cliff).to.equal(5)
    expect(periodLength).to.equal(2)
    expect(percentPerPeriod).to.equal(10)
  })
})
