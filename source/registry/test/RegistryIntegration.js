const { expect } = require('chai')
const { ethers } = require('hardhat')
const ERC20PresetFixedSupply = require('@openzeppelin/contracts/build/contracts/ERC20PresetFixedSupply.json')

describe('Registry Integration', () => {
  let snapshotId
  let deployer
  let account1
  const protocol1 = '0x00000001'
  const protocol2 = '0x00000002'
  const protocol3 = '0x00000003'
  let token1
  let token2
  let token3
  let stakingToken
  let registryFactory
  let registry
  const STAKING_COST = 1000
  const SUPPORT_COST = 10

  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  before(async () => {
    ;[deployer, account1, token1, token2, token3] = await ethers.getSigners()
    stakingToken = await (
      await ethers.getContractFactory(
        ERC20PresetFixedSupply.abi,
        ERC20PresetFixedSupply.bytecode
      )
    ).deploy('TestERC20', 'TERC20', '10000', account1.address)

    await stakingToken.deployed()

    registryFactory = await ethers.getContractFactory('Registry')
    registry = await registryFactory
      .connect(deployer)
      .deploy(stakingToken.address, STAKING_COST, SUPPORT_COST)
    await registry.deployed()
    stakingToken.connect(account1).approve(registry.address, '10000')
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

  describe('staking cost transfers', async () => {
    it('staking cost is always transferred when a URL is set', async () => {
      await expect(registry.connect(account1).setServerURL('maker1.com'))
        .to.emit(registry, 'SetServer')
        .withArgs(account1.address, 'maker1.com')

      const urls = await registry.getServerURLsForStakers([account1.address])
      expect(urls.length).to.equal(1)
      expect(urls[0]).to.equal('maker1.com')
      expect(await stakingToken.balanceOf(registry.address)).to.equal(
        STAKING_COST
      )
    })

    it('staking cost is always retruned when a URL is unset', async () => {
      await registry.connect(account1).setServerURL('maker1.com')
      await expect(registry.connect(account1).removeServer())
        .to.emit(registry, 'UnsetServer')
        .withArgs(account1.address, 'maker1.com', [], [])

      expect(await stakingToken.balanceOf(registry.address)).to.equal(0)
    })
  })

  describe('support costs transfers', async () => {
    it('support cost is always transferred for every protocol added.', async () => {
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

      expect(await stakingToken.balanceOf(registry.address)).to.equal(
        SUPPORT_COST * 3
      )
    })

    it('support cost is always returned for every protocol removed', async () => {
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

      expect(await stakingToken.balanceOf(registry.address)).to.equal(0)
    })
  })

  it('support cost is always transferred for every token added', async () => {
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

    expect(await stakingToken.balanceOf(registry.address)).to.equal(
      SUPPORT_COST * 3
    )
  })

  it('support cost is always returned for every token removed', async () => {
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

    expect(await stakingToken.balanceOf(registry.address)).to.equal(0)
  })
})
