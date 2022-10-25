const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')

describe('Registry Unit', () => {
  let snapshotId
  let deployer
  let account1
  let account2
  let stakingToken
  let registryFactory
  let registry

  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  before(async () => {
    ;[deployer, account1, account2, token1, token2, token3] =
      await ethers.getSigners()
    stakingToken = await deployMockContract(deployer, IERC20.abi)
    registryFactory = await ethers.getContractFactory('Indexers')
    registry = await registryFactory.deploy()
    await registry.deployed()
  })

  describe('Set URL', async () => {
    it('successful setting of url', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await expect(registry.connect(account1).setURL('www.noneURL.com'))
        .to.emit(registry, 'SetURL')
        .withArgs(account1.address, 'www.noneURL.com')

      const urls = await registry.getURLs()
      expect(urls.length).to.equal(1)
      expect(urls[0]).to.equal('www.noneURL.com')
    })

    it('successful changing of url, check by staker', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await registry.connect(account1).setURL('www.noneURL.com')
      await registry.connect(account1).setURL('www.TheCatsMeow.com')

      const urls = await registry.getURLs()
      expect(urls.length).to.equal(1)
      expect(urls[0]).to.equal('www.TheCatsMeow.com')
    })

    it('successful fetching of multiple urls', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await registry.connect(account1).setURL('www.noneURL.com')
      await registry.connect(account2).setURL('www.TheCatsMeow.com')

      const urls = await registry.getURLs()
      expect(urls.length).to.equal(2)
      expect(urls[0]).to.equal('www.noneURL.com')
      expect(urls[1]).to.equal('www.TheCatsMeow.com')
    })
  })
})
