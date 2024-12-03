const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')

describe('Registry Unit', () => {
  let snapshotId
  let deployer
  let account1
  let account2
  const protocol1 = '0x00000001'
  const protocol2 = '0x00000002'
  const protocol3 = '0x00000003'
  let token1
  let token2
  let token3
  let stakingToken
  let registryFactory
  let registry
  let registryZeroCost
  const STAKING_COST = 1000
  const SUPPORT_COST = 10

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
    registryFactory = await ethers.getContractFactory('Registry')
    registry = await registryFactory.deploy(
      stakingToken.address,
      STAKING_COST,
      SUPPORT_COST
    )
    await registry.deployed()
  })

  describe('constructor values', async () => {
    it('constructor set correct values', async () => {
      const tokenAddress = await registry.stakingToken()
      const stakingCost = await registry.stakingCost()
      const supportCost = await registry.supportCost()
      expect(tokenAddress).to.equal(stakingToken.address)
      expect(stakingCost).to.equal(STAKING_COST)
      expect(supportCost).to.equal(SUPPORT_COST)
    })
  })

  describe('stake for a server', async () => {
    it('fails for bad url', async () => {
      await expect(
        registry.connect(account1).setServerURL('')
      ).to.be.revertedWith('ServerURLInvalid')
    })

    it('successful setting of url', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await expect(registry.connect(account1).setServerURL('maker1.com'))
        .to.emit(registry, 'SetServerURL')
        .withArgs(account1.address, 'maker1.com')

      const urls = await registry.getServerURLsForStakers([account1.address])
      expect(urls.length).to.equal(1)
      expect(urls[0]).to.equal('maker1.com')
    })

    it('successful changing of url, check by staker', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await registry.connect(account1).setServerURL('maker1.com')
      await registry.connect(account1).setServerURL('maker2.com')

      const urls = await registry.getServerURLsForStakers([account1.address])
      expect(urls.length).to.equal(1)
      expect(urls[0]).to.equal('maker2.com')
    })

    it('successful changing of url, check by token', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await registry.connect(account1).setServerURL('maker1.com')
      await registry.connect(account1).setServerURL('maker2.com')

      await stakingToken.mock.transferFrom.returns(true)
      await expect(
        registry
          .connect(account1)
          .addTokens([token1.address, token2.address, token3.address])
      )
        .to.emit(registry, 'AddTokens')
        .withArgs(account1.address, [
          token1.address,
          token2.address,
          token3.address,
        ])

      const urls = await registry.getServerURLsForToken(token3.address)
      expect(urls.length).to.equal(1)
      expect(urls[0]).to.equal('maker2.com')
    })

    it('successful changing of url, check by protocol', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await registry.connect(account1).setServerURL('maker1.com')
      await registry.connect(account1).setServerURL('maker2.com')

      await expect(
        registry
          .connect(account1)
          .addProtocols([protocol1, protocol2, protocol3])
      )
        .to.emit(registry, 'AddProtocols')
        .withArgs(account1.address, [protocol1, protocol2, protocol3])

      const urls = await registry.getServerURLsForProtocol(protocol3)
      expect(urls.length).to.equal(1)
      expect(urls[0]).to.equal('maker2.com')
    })

    it('successful fetching of multiple urls', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await registry.connect(account1).setServerURL('maker1.com')
      await registry.connect(account2).setServerURL('maker2.com')

      const urls = await registry.getServerURLsForStakers([
        account1.address,
        account2.address,
      ])
      expect(urls.length).to.equal(2)
      expect(urls[0]).to.equal('maker1.com')
      expect(urls[1]).to.equal('maker2.com')
    })

    it('successful fetching of multiple urls where one address has an empty url', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await registry.connect(account1).setServerURL('maker1.com')

      const urls = await registry.getServerURLsForStakers([
        account1.address,
        account2.address,
      ])
      expect(urls.length).to.equal(2)
      expect(urls[0]).to.equal('maker1.com')
      expect(urls[1]).to.equal('')
    })
  })

  describe('supported protocols', async () => {
    it('fails to add an empty list of protocols', async () => {
      await expect(
        registry.connect(account1).addProtocols([])
      ).to.be.revertedWith('ArgumentInvalid')
    })

    it('add a list of protocols', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await expect(
        registry
          .connect(account1)
          .addProtocols([protocol1, protocol2, protocol3])
      )
        .to.emit(registry, 'AddProtocols')
        .withArgs(account1.address, [protocol1, protocol2, protocol3])

      const protocols = await registry.getProtocolsForStaker(account1.address)
      expect(protocols.length).to.equal(3)
      expect(protocols[0]).to.equal(protocol1)
      expect(protocols[1]).to.equal(protocol2)
      expect(protocols[2]).to.equal(protocol3)

      const protocol1Stakers = await registry.getStakersForProtocol(protocol1)
      const protocol2Stakers = await registry.getStakersForProtocol(protocol2)
      const protocol3Stakers = await registry.getStakersForProtocol(protocol3)
      expect(protocol1Stakers.length).to.equal(1)
      expect(protocol2Stakers.length).to.equal(1)
      expect(protocol3Stakers.length).to.equal(1)
      expect(protocol1Stakers[0]).to.equal(account1.address)
      expect(protocol2Stakers[0]).to.equal(account1.address)
      expect(protocol3Stakers[0]).to.equal(account1.address)

      const protocol1Supported = await registry.supportsProtocol(
        account1.address,
        protocol1
      )
      const protocol2Supported = await registry.supportsProtocol(
        account1.address,
        protocol2
      )
      const protocol3Supported = await registry.supportsProtocol(
        account1.address,
        protocol3
      )
      expect(protocol1Supported).to.equal(true)
      expect(protocol2Supported).to.equal(true)
      expect(protocol3Supported).to.equal(true)
    })

    it('fails to add a list of duplicate protocols', async () => {
      await expect(
        registry
          .connect(account1)
          .addProtocols([protocol1, protocol2, protocol1])
      )
        .to.be.revertedWith('ProtocolExists')
        .withArgs(protocol1)
    })

    it('fails to add a duplicate protocol', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await registry.connect(account1).addProtocols([protocol1, protocol2])
      await expect(registry.connect(account1).addProtocols([protocol1]))
        .to.be.revertedWith('ProtocolExists')
        .withArgs(protocol1)
    })

    it('fails to remove an empty list of protocols', async () => {
      await expect(
        registry.connect(account1).removeProtocols([])
      ).to.be.revertedWith('ArgumentInvalid')
    })

    it('remove a list of protocols', async () => {
      await stakingToken.mock.transfer.returns(true)
      await stakingToken.mock.transferFrom.returns(true)
      await registry
        .connect(account1)
        .addProtocols([protocol1, protocol2, protocol3])

      await expect(
        registry
          .connect(account1)
          .removeProtocols([protocol1, protocol2, protocol3])
      )
        .to.emit(registry, 'RemoveProtocols')
        .withArgs(account1.address, [protocol1, protocol2, protocol3])

      const protocols = await registry.getProtocolsForStaker(account1.address)
      expect(protocols.length).to.equal(0)

      const protocol1Stakers = await registry.getStakersForProtocol(protocol1)
      const protocol2Stakers = await registry.getStakersForProtocol(protocol2)
      const protocol3Stakers = await registry.getStakersForProtocol(protocol3)
      expect(protocol1Stakers.length).to.equal(0)
      expect(protocol2Stakers.length).to.equal(0)
      expect(protocol3Stakers.length).to.equal(0)

      const protocol1Supported = await registry.supportsProtocol(
        account1.address,
        protocol1
      )
      const protocol2Supported = await registry.supportsProtocol(
        account1.address,
        protocol2
      )
      const protocol3Supported = await registry.supportsProtocol(
        account1.address,
        protocol3
      )
      expect(protocol1Supported).to.equal(false)
      expect(protocol2Supported).to.equal(false)
      expect(protocol3Supported).to.equal(false)
    })

    it('fails to remove a list of duplicate protocols', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await registry
        .connect(account1)
        .addProtocols([protocol1, protocol2, protocol3])

      await expect(
        registry
          .connect(account1)
          .removeProtocols([protocol1, protocol2, protocol1])
      )
        .to.be.revertedWith('ProtocolDoesNotExist')
        .withArgs(protocol1)
    })

    it('fails to remove a protocol already removed', async () => {
      await stakingToken.mock.transfer.returns(true)
      await stakingToken.mock.transferFrom.returns(true)
      await registry
        .connect(account1)
        .addProtocols([protocol1, protocol2, protocol3])

      await registry
        .connect(account1)
        .removeProtocols([protocol1, protocol2, protocol3])

      await expect(registry.connect(account1).removeProtocols([protocol1]))
        .to.be.revertedWith('ProtocolDoesNotExist')
        .withArgs(protocol1)
    })
  })

  describe('supported tokens', async () => {
    it('fails to add an empty list of tokens', async () => {
      await expect(registry.connect(account1).addTokens([])).to.be.revertedWith(
        'ArgumentInvalid'
      )
    })

    it('add a list of tokens when there is sufficient stake token', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await expect(
        registry
          .connect(account1)
          .addTokens([token1.address, token2.address, token3.address])
      )
        .to.emit(registry, 'AddTokens')
        .withArgs(account1.address, [
          token1.address,
          token2.address,
          token3.address,
        ])

      const tokens = await registry.getTokensForStaker(account1.address)
      expect(tokens.length).to.equal(3)
      expect(tokens[0]).to.equal(token1.address)
      expect(tokens[1]).to.equal(token2.address)
      expect(tokens[2]).to.equal(token3.address)

      const token1Stakers = await registry.getStakersForToken(token1.address)
      const token2Stakers = await registry.getStakersForToken(token2.address)
      const token3Stakers = await registry.getStakersForToken(token3.address)
      expect(token1Stakers.length).to.equal(1)
      expect(token2Stakers.length).to.equal(1)
      expect(token3Stakers.length).to.equal(1)
      expect(token1Stakers[0]).to.equal(account1.address)
      expect(token2Stakers[0]).to.equal(account1.address)
      expect(token3Stakers[0]).to.equal(account1.address)

      const token1Supported = await registry.supportsToken(
        account1.address,
        token1.address
      )
      const token2Supported = await registry.supportsToken(
        account1.address,
        token2.address
      )
      const token3Supported = await registry.supportsToken(
        account1.address,
        token3.address
      )
      expect(token1Supported).to.equal(true)
      expect(token2Supported).to.equal(true)
      expect(token3Supported).to.equal(true)
    })

    it('add a list of tokens when there is insufficent stake token', async () => {
      await stakingToken.mock.transferFrom.returns(false)
      await expect(
        registry
          .connect(account1)
          .addTokens([token1.address, token2.address, token3.address])
      ).to.be.revertedWith('SafeERC20: ERC20 operation did not succeed')
    })

    it('fails to add a list of duplicate tokens', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await expect(
        registry
          .connect(account1)
          .addTokens([token1.address, token2.address, token1.address])
      )
        .to.be.revertedWith('TokenExists')
        .withArgs(token1.address)
    })

    it('fails to add a duplicate token', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await registry
        .connect(account1)
        .addTokens([token1.address, token2.address])
      await expect(registry.connect(account1).addTokens([token1.address]))
        .to.be.revertedWith('TokenExists')
        .withArgs(token1.address)
    })

    it('fails to remove an empty list of tokens', async () => {
      await expect(
        registry.connect(account1).removeTokens([])
      ).to.be.revertedWith('ArgumentInvalid')
    })

    it('remove a list of tokens', async () => {
      await stakingToken.mock.transfer.returns(true)
      await stakingToken.mock.transferFrom.returns(true)
      await registry
        .connect(account1)
        .addTokens([token1.address, token2.address, token3.address])

      await expect(
        registry
          .connect(account1)
          .removeTokens([token1.address, token2.address, token3.address])
      )
        .to.emit(registry, 'RemoveTokens')
        .withArgs(account1.address, [
          token1.address,
          token2.address,
          token3.address,
        ])

      const tokens = await registry.getTokensForStaker(account1.address)
      expect(tokens.length).to.equal(0)

      const token1Stakers = await registry.getStakersForToken(token1.address)
      const token2Stakers = await registry.getStakersForToken(token2.address)
      const token3Stakers = await registry.getStakersForToken(token3.address)
      expect(token1Stakers.length).to.equal(0)
      expect(token2Stakers.length).to.equal(0)
      expect(token3Stakers.length).to.equal(0)

      const token1Supported = await registry.supportsToken(
        account1.address,
        token1.address
      )
      const token2Supported = await registry.supportsToken(
        account1.address,
        token2.address
      )
      const token3Supported = await registry.supportsToken(
        account1.address,
        token3.address
      )
      expect(token1Supported).to.equal(false)
      expect(token2Supported).to.equal(false)
      expect(token3Supported).to.equal(false)
    })

    it('fails to remove a server without a url set', async () => {
      await expect(registry.connect(account1).unsetServer()).to.be.revertedWith(
        'NoServerURLSet'
      )
    })

    it('successfully remove a server', async () => {
      await stakingToken.mock.transfer.returns(true)
      await stakingToken.mock.transferFrom.returns(true)
      await registry.connect(account1).setServerURL('maker1.com')
      await registry
        .connect(account1)
        .addProtocols([protocol1, protocol2, protocol3])
      await registry
        .connect(account1)
        .addTokens([token1.address, token2.address, token3.address])
      await expect(registry.connect(account1).unsetServer())
        .to.emit(registry, 'UnsetServer')
        .withArgs(
          account1.address,
          'maker1.com',
          [protocol1, protocol2, protocol3],
          [token1.address, token2.address, token3.address]
        )

      const protocols = await registry.getProtocolsForStaker(account1.address)
      expect(protocols.length).to.equal(0)

      const protocol1Stakers = await registry.getStakersForProtocol(protocol1)
      const protocol2Stakers = await registry.getStakersForProtocol(protocol2)
      const protocol3Stakers = await registry.getStakersForProtocol(protocol3)
      expect(protocol1Stakers.length).to.equal(0)
      expect(protocol2Stakers.length).to.equal(0)
      expect(protocol3Stakers.length).to.equal(0)

      const tokens = await registry.getTokensForStaker(account1.address)
      expect(tokens.length).to.equal(0)

      const token1Stakers = await registry.getStakersForToken(token1.address)
      const token2Stakers = await registry.getStakersForToken(token2.address)
      const token3Stakers = await registry.getStakersForToken(token3.address)
      expect(token1Stakers.length).to.equal(0)
      expect(token2Stakers.length).to.equal(0)
      expect(token3Stakers.length).to.equal(0)

      await expect(registry.connect(account1).unsetServer()).to.be.revertedWith(
        'NoServerURLSet'
      )
    })

    it('fails to remove a list of duplicate tokens', async () => {
      await stakingToken.mock.transfer.returns(true)
      await stakingToken.mock.transferFrom.returns(true)
      await registry
        .connect(account1)
        .addTokens([token1.address, token2.address, token3.address])

      await expect(
        registry
          .connect(account1)
          .removeTokens([token1.address, token2.address, token1.address])
      )
        .to.be.revertedWith('TokenDoesNotExist')
        .withArgs(token1.address)
    })

    it('fails to remove a token already removed', async () => {
      await stakingToken.mock.transfer.returns(true)
      await stakingToken.mock.transferFrom.returns(true)
      await registry
        .connect(account1)
        .addTokens([token1.address, token2.address, token3.address])

      await registry
        .connect(account1)
        .removeTokens([token1.address, token2.address, token3.address])

      await expect(registry.connect(account1).removeTokens([token1.address]))
        .to.be.revertedWith('TokenDoesNotExist')
        .withArgs(token1.address)
    })
  })

  describe('zero amount transfers', async () => {
    beforeEach(async () => {
      const zero_cost = '0'
      registryZeroCost = await registryFactory.deploy(
        stakingToken.address,
        zero_cost,
        zero_cost
      )
      await registryZeroCost.deployed()
    })

    it('zero transfer amount', async () => {
      await expect(
        registryZeroCost.connect(account1).addTokens([token1.address])
      )
        .to.emit(registryZeroCost, 'AddTokens')
        .withArgs(account1.address, [token1.address])
    })
    it('when removing protocol', async () => {
      await registryZeroCost.connect(account1).addProtocols([protocol1])
      await expect(
        registryZeroCost.connect(account1).removeProtocols([protocol1])
      )
        .to.emit(registryZeroCost, 'RemoveProtocols')
        .withArgs(account1.address, [protocol1])
    })
    it('when removing all protocols', async () => {
      await registryZeroCost.connect(account1).setServerURL('maker1.com')
      await registryZeroCost.connect(account1).addProtocols([protocol1])
      await expect(registryZeroCost.connect(account1).unsetServer())
        .to.emit(registryZeroCost, 'UnsetServer')
        .withArgs(account1.address, 'maker1.com', [protocol1], [])
    })
    it('when removing token', async () => {
      await registryZeroCost.connect(account1).addTokens([token1.address])
      await expect(
        registryZeroCost.connect(account1).removeTokens([token1.address])
      )
        .to.emit(registryZeroCost, 'RemoveTokens')
        .withArgs(account1.address, [token1.address])
    })
    it('when removing all tokens', async () => {
      await registryZeroCost.connect(account1).setServerURL('maker1.com')
      await registryZeroCost.connect(account1).addTokens([token1.address])
      await expect(registryZeroCost.connect(account1).unsetServer())
        .to.emit(registryZeroCost, 'UnsetServer')
        .withArgs(account1.address, 'maker1.com', [], [token1.address])
    })
  })

  describe('balance of', async () => {
    it('verify balance without a staked server', async () => {
      const balance = await registry.balanceOf(account1.address)
      expect(balance).to.equal(0)
    })

    it('verify balance after adding protocols', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await registry.connect(account1).setServerURL('maker1.com')
      await registry.connect(account1).addProtocols([protocol1, protocol2])

      const balance = await registry.balanceOf(account1.address)
      expect(balance).to.equal(STAKING_COST + SUPPORT_COST * 2)
    })

    it('verify balance after removing protocols', async () => {
      await stakingToken.mock.transfer.returns(true)
      await stakingToken.mock.transferFrom.returns(true)
      await registry.connect(account1).setServerURL('maker1.com')
      await registry.connect(account1).addProtocols([protocol1, protocol2])

      await registry.connect(account1).removeProtocols([protocol1])

      const balance = await registry.balanceOf(account1.address)
      expect(balance).to.equal(STAKING_COST + SUPPORT_COST)
    })

    it('verify balance after adding tokens', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await registry.connect(account1).setServerURL('maker1.com')
      await registry
        .connect(account1)
        .addTokens([token1.address, token2.address, token3.address])

      const balance = await registry.balanceOf(account1.address)
      expect(balance).to.equal(STAKING_COST + SUPPORT_COST * 3)
    })

    it('verify balance after removing tokens', async () => {
      await stakingToken.mock.transfer.returns(true)
      await stakingToken.mock.transferFrom.returns(true)
      await registry.connect(account1).setServerURL('maker1.com')
      await registry
        .connect(account1)
        .addTokens([token1.address, token2.address, token3.address])

      await registry.connect(account1).removeTokens([token2.address])

      const balance = await registry.balanceOf(account1.address)
      expect(balance).to.equal(STAKING_COST + SUPPORT_COST * 2)
    })
  })
})
