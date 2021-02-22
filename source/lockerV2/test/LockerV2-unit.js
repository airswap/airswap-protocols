const { expect } = require('chai')
const timeMachine = require('ganache-time-traveler')
const { artifacts, ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const ERC20 = artifacts.require('ERC20')
const ERC20_Interface = new ethers.utils.Interface(ERC20.abi)

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
    stakingToken = await deployMockContract(ERC20.abi)
  })

  it('Constructor', async function () {
    const LockerFactory = await ethers.getContractFactory('LockerV2')
    const locker = await LockerFactory.deploy(stakingToken.address, 5, 2, 10)
    await locker.deployed()
  })
})
