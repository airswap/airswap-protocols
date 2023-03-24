const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')

describe('MakerRegistry Unit', () => {
  let snapshotId
  let deployer
  let account1
  let account2
  let protocol1
  let protocol2
  let protocol3
  let stakingToken
  let registryFactory
  let registry
  let registryZeroCost
  const OBLIGATION_COST = 1000
  const TOKEN_COST = 10
  const PROTOCOL_COST = 10

  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  before(async () => {
    ;[deployer, account1, account2, protocol1, protocol2, protocol3] =
      await ethers.getSigners()
    stakingToken = await deployMockContract(deployer, IERC20.abi)
    registryFactory = await ethers.getContractFactory('MakerRegistry')
    registry = await registryFactory.deploy(
      stakingToken.address,
      OBLIGATION_COST,
      TOKEN_COST,
      PROTOCOL_COST
    )
    await registry.deployed()
  })

  describe('Default Values', async () => {
    it('constructor set default values', async () => {
      const tokenAddress = await registry.stakingToken()
      const obligationCost = await registry.obligationCost()
      const protocolCost = await registry.protocolCost()
      expect(tokenAddress).to.equal(stakingToken.address)
      expect(obligationCost).to.equal(OBLIGATION_COST)
      expect(protocolCost).to.equal(PROTOCOL_COST)
    })
  })

  describe('Add Protocols', async () => {
    it('add an empty list of protocols fails', async () => {
      await expect(
        registry.connect(account1).addProtocols([])
      ).to.be.revertedWith('NoProtocolsToAdd()')
    })

    it('add a list of protocols when there is sufficient stake token', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await expect(
        registry
          .connect(account1)
          .addProtocols([
            protocol1.address,
            protocol2.address,
            protocol3.address,
          ])
      )
        .to.emit(registry, 'AddProtocols')
        .withArgs(account1.address, [
          protocol1.address,
          protocol2.address,
          protocol3.address,
        ])

      const tokens = await registry.getSupportedProtocols(account1.address)
      expect(tokens.length).to.equal(3)
      expect(tokens[0]).to.equal(protocol1.address)
      expect(tokens[1]).to.equal(protocol2.address)
      expect(tokens[2]).to.equal(protocol3.address)

      const protocol1Stakers = await registry.getStakersForProtocol(
        protocol1.address
      )
      const protocol2Stakers = await registry.getStakersForProtocol(
        protocol2.address
      )
      const protocol3Stakers = await registry.getStakersForProtocol(
        protocol3.address
      )
      expect(protocol1Stakers.length).to.equal(1)
      expect(protocol2Stakers.length).to.equal(1)
      expect(protocol3Stakers.length).to.equal(1)
      expect(protocol1Stakers[0]).to.equal(account1.address)
      expect(protocol2Stakers[0]).to.equal(account1.address)
      expect(protocol3Stakers[0]).to.equal(account1.address)

      const protocol1Supported = await registry.supportsProtocol(
        account1.address,
        protocol1.address
      )
      const protocol2Supported = await registry.supportsProtocol(
        account1.address,
        protocol2.address
      )
      const protocol3Supported = await registry.supportsProtocol(
        account1.address,
        protocol3.address
      )
      expect(protocol1Supported).to.equal(true)
      expect(protocol2Supported).to.equal(true)
      expect(protocol3Supported).to.equal(true)
    })

    it('add a list of tokens when there is insufficent stake token', async () => {
      await stakingToken.mock.transferFrom.returns(false)
      await expect(
        registry
          .connect(account1)
          .addProtocols([
            protocol1.address,
            protocol2.address,
            protocol3.address,
          ])
      ).to.be.revertedWith('SafeERC20: ERC20 operation did not succeed')
    })

    it('add a list of duplicate tokens fails', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await expect(
        registry
          .connect(account1)
          .addProtocols([
            protocol1.address,
            protocol2.address,
            protocol1.address,
          ])
      ).to.be.revertedWith(`ProtocolExists("${protocol1.address}")`)
    })

    it('add a duplicate token', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await registry
        .connect(account1)
        .addProtocols([protocol1.address, protocol2.address])
      await expect(
        registry.connect(account1).addProtocols([protocol1.address])
      ).to.be.revertedWith(`ProtocolExists("${protocol1.address}")`)
    })
  })

  describe('Remove Tokens', async () => {
    it('remove an empty list of tokens fails', async () => {
      await expect(
        registry.connect(account1).removeProtocols([])
      ).to.be.revertedWith('NoProtocolsToRemove()')
    })

    it('remove a list of tokens', async () => {
      await stakingToken.mock.transfer.returns(true)
      await stakingToken.mock.transferFrom.returns(true)
      await registry
        .connect(account1)
        .addProtocols([protocol1.address, protocol2.address, protocol3.address])

      await expect(
        registry
          .connect(account1)
          .removeProtocols([
            protocol1.address,
            protocol2.address,
            protocol3.address,
          ])
      )
        .to.emit(registry, 'RemoveProtocols')
        .withArgs(account1.address, [
          protocol1.address,
          protocol2.address,
          protocol3.address,
        ])

      const tokens = await registry.getSupportedProtocols(account1.address)
      expect(tokens.length).to.equal(0)

      const protocol1Stakers = await registry.getStakersForProtocol(
        protocol1.address
      )
      const protocol2Stakers = await registry.getStakersForProtocol(
        protocol2.address
      )
      const protocol3Stakers = await registry.getStakersForProtocol(
        protocol3.address
      )
      expect(protocol1Stakers.length).to.equal(0)
      expect(protocol2Stakers.length).to.equal(0)
      expect(protocol3Stakers.length).to.equal(0)

      const protocol1Supported = await registry.supportsProtocol(
        account1.address,
        protocol1.address
      )
      const protocol2Supported = await registry.supportsProtocol(
        account1.address,
        protocol2.address
      )
      const protocol3Supported = await registry.supportsProtocol(
        account1.address,
        protocol3.address
      )
      expect(protocol1Supported).to.equal(false)
      expect(protocol2Supported).to.equal(false)
      expect(protocol3Supported).to.equal(false)
    })

    it('remove all tokens for a staker fails when there are no tokens to remove', async () => {
      await expect(
        registry.connect(account1).removeAllProtocols()
      ).to.be.revertedWith('NoProtocolsToRemove()')
    })

    it('remove all tokens for an staker', async () => {
      await stakingToken.mock.transfer.returns(true)
      await stakingToken.mock.transferFrom.returns(true)
      await registry
        .connect(account1)
        .addProtocols([protocol1.address, protocol2.address, protocol3.address])
      await expect(registry.connect(account1).removeAllProtocols())
        .to.emit(registry, 'RemoveProtocols')
        .withArgs(account1.address, [
          protocol1.address,
          protocol2.address,
          protocol3.address,
        ])

      //NOTE: Note that there are no guarantees on the ordering of values inside the array, and it may change when more values are added or removed.
      // this is why protocol1, protocol3, protocol2 are in the above order
      const tokens = await registry.getSupportedProtocols(account1.address)
      expect(tokens.length).to.equal(0)

      const protocol1Stakers = await registry.getStakersForProtocol(
        protocol1.address
      )
      const protocol2Stakers = await registry.getStakersForProtocol(
        protocol2.address
      )
      const protocol3Stakers = await registry.getStakersForProtocol(
        protocol3.address
      )
      expect(protocol1Stakers.length).to.equal(0)
      expect(protocol2Stakers.length).to.equal(0)
      expect(protocol3Stakers.length).to.equal(0)
    })

    it('remove a list of duplicate tokens fails', async () => {
      await stakingToken.mock.transfer.returns(true)
      await stakingToken.mock.transferFrom.returns(true)
      await registry
        .connect(account1)
        .addProtocols([protocol1.address, protocol2.address, protocol3.address])

      await expect(
        registry
          .connect(account1)
          .removeProtocols([
            protocol1.address,
            protocol2.address,
            protocol1.address,
          ])
      ).to.be.revertedWith(`ProtocolDoesNotExists("${protocol1.address}")`)
    })

    it('remove a token already removed fails', async () => {
      await stakingToken.mock.transfer.returns(true)
      await stakingToken.mock.transferFrom.returns(true)
      await registry
        .connect(account1)
        .addProtocols([protocol1.address, protocol2.address, protocol3.address])

      await registry
        .connect(account1)
        .removeProtocols([
          protocol1.address,
          protocol2.address,
          protocol3.address,
        ])

      await expect(
        registry.connect(account1).removeProtocols([protocol1.address])
      ).to.be.revertedWith(`ProtocolDoesNotExists("${protocol1.address}")`)
    })
  })

  describe('Test Zero Amount Transfer', async () => {
    beforeEach(async () => {
      let zero_cost = '0'
      registryZeroCost = await registryFactory.deploy(
        stakingToken.address,
        zero_cost,
        zero_cost,
        zero_cost
      )
      await registryZeroCost.deployed()
    })

    it('zero transfer amount', async () => {
      await expect(
        registryZeroCost.connect(account1).addProtocols([protocol1.address])
      )
        .to.emit(registryZeroCost, 'AddProtocols')
        .withArgs(account1.address, [protocol1.address])
    })
    it('zero transfer amount when removing token', async () => {
      await registryZeroCost.connect(account1).addProtocols([protocol1.address])
      await expect(
        registryZeroCost.connect(account1).removeProtocols([protocol1.address])
      )
        .to.emit(registryZeroCost, 'RemoveProtocols')
        .withArgs(account1.address, [protocol1.address])
    })
    it('zero transfer amount when removing all tokens', async () => {
      await registryZeroCost
        .connect(account1)
        .addProtocols([protocol1.address, protocol2.address, protocol3.address])
      await expect(registryZeroCost.connect(account1).removeAllProtocols())
        .to.emit(registryZeroCost, 'FullUnstake')
        .withArgs(account1.address)
    })
  })

  describe('Set URL', async () => {
    it('successful setting of url', async () => {
      await expect(registry.connect(account1).setURL('www.noneURL.com'))
        .to.emit(registry, 'SetURL')
        .withArgs(account1.address, 'www.noneURL.com')

      const urls = await registry.getURLsForStakers([account1.address])
      expect(urls.length).to.equal(1)
      expect(urls[0]).to.equal('www.noneURL.com')
    })

    it('successful changing of url, check by staker', async () => {
      await registry.connect(account1).setURL('www.noneURL.com')
      await registry.connect(account1).setURL('www.TheCatsMeow.com')

      const urls = await registry.getURLsForStakers([account1.address])
      expect(urls.length).to.equal(1)
      expect(urls[0]).to.equal('www.TheCatsMeow.com')
    })

    it('successful changing of url, check by token', async () => {
      await registry.connect(account1).setURL('www.noneURL.com')
      await registry.connect(account1).setURL('www.TheCatsMeow.com')

      await stakingToken.mock.transferFrom.returns(true)
      await expect(
        registry
          .connect(account1)
          .addProtocols([
            protocol1.address,
            protocol2.address,
            protocol3.address,
          ])
      )
        .to.emit(registry, 'AddProtocols')
        .withArgs(account1.address, [
          protocol1.address,
          protocol2.address,
          protocol3.address,
        ])

      const urls = await registry.getURLsForProtocol(protocol3.address)
      expect(urls.length).to.equal(1)
      expect(urls[0]).to.equal('www.TheCatsMeow.com')
    })

    it('successful fetching of multiple urls', async () => {
      await registry.connect(account1).setURL('www.noneURL.com')
      await registry.connect(account2).setURL('www.TheCatsMeow.com')

      const urls = await registry.getURLsForStakers([
        account1.address,
        account2.address,
      ])
      expect(urls.length).to.equal(2)
      expect(urls[0]).to.equal('www.noneURL.com')
      expect(urls[1]).to.equal('www.TheCatsMeow.com')
    })

    it('successful fetching of multiple urls where one address has an empty url', async () => {
      await registry.connect(account1).setURL('www.noneURL.com')

      const urls = await registry.getURLsForStakers([
        account1.address,
        account2.address,
      ])
      expect(urls.length).to.equal(2)
      expect(urls[0]).to.equal('www.noneURL.com')
      expect(urls[1]).to.equal('')
    })
  })

  describe('Balance Of', async () => {
    it('verify expected balance when a user has no tokens', async () => {
      const balance = await registry.balanceOf(account1.address)
      expect(balance).to.equal(0)
    })

    it('verify expected staking balance after a user has added tokens', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await registry
        .connect(account1)
        .addProtocols([protocol1.address, protocol2.address, protocol3.address])

      const balance = await registry.balanceOf(account1.address)
      expect(balance).to.equal(OBLIGATION_COST + PROTOCOL_COST * 3)
    })

    it('verify expected staking balance after a user has removed tokens', async () => {
      await stakingToken.mock.transfer.returns(true)
      await stakingToken.mock.transferFrom.returns(true)
      await registry
        .connect(account1)
        .addProtocols([protocol1.address, protocol2.address, protocol3.address])

      await registry.connect(account1).removeProtocols([protocol2.address])

      const balance = await registry.balanceOf(account1.address)
      expect(balance).to.equal(OBLIGATION_COST + PROTOCOL_COST * 2)
    })
  })
})
