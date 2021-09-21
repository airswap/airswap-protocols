const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')

describe('Registry Unit', () => {
  let snapshotId
  let deployer
  let account1
  let account2
  let token1
  let token2
  let token3
  let stakingToken
  let registryFactory
  let registry
  const OBLIGATION_COST = 1000
  const TOKEN_COST = 10

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
      OBLIGATION_COST,
      TOKEN_COST
    )
    await registry.deployed()
  })

  describe('Default Values', async () => {
    it('constructor set default values', async () => {
      const tokenAddress = await registry.stakingToken()
      const obligationCost = await registry.obligationCost()
      const tokenCost = await registry.tokenCost()
      expect(tokenAddress).to.equal(stakingToken.address)
      expect(obligationCost).to.equal(OBLIGATION_COST)
      expect(tokenCost).to.equal(TOKEN_COST)
    })
  })

  describe('Add Tokens', async () => {
    it('add an empty list of tokens fails', async () => {
      await expect(registry.connect(account1).addTokens([])).to.be.revertedWith(
        'NO_TOKENS_TO_ADD'
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

      const tokens = await registry.getSupportedTokens(account1.address)
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
      await stakingToken.mock.transferFrom.revertsWithReason(
        'Insufficient Funds'
      )
      await expect(
        registry
          .connect(account1)
          .addTokens([token1.address, token2.address, token3.address])
      ).to.be.revertedWith('Insufficient Funds')
    })

    it('add a list of duplicate tokens fails', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await expect(
        registry
          .connect(account1)
          .addTokens([token1.address, token2.address, token1.address])
      ).to.be.revertedWith('TOKEN_EXISTS')
    })

    it('add a duplicate token', async () => {
      await stakingToken.mock.transferFrom.returns(true)
      await registry
        .connect(account1)
        .addTokens([token1.address, token2.address])
      await expect(
        registry.connect(account1).addTokens([token1.address])
      ).to.be.revertedWith('TOKEN_EXISTS')
    })
  })

  describe('Remove Tokens', async () => {
    it('remove an empty list of tokens fails', async () => {
      await expect(
        registry.connect(account1).removeTokens([])
      ).to.be.revertedWith('NO_TOKENS_TO_REMOVE')
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

      const tokens = await registry.getSupportedTokens(account1.address)
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

    it('remove all tokens for a staker fails when there are no tokens to remove', async () => {
      await expect(
        registry.connect(account1).removeAllTokens()
      ).to.be.revertedWith('NO_TOKENS_TO_REMOVE')
    })

    it('remove all tokens for an staker', async () => {
      await stakingToken.mock.transfer.returns(true)
      await stakingToken.mock.transferFrom.returns(true)
      await registry
        .connect(account1)
        .addTokens([token1.address, token2.address, token3.address])
      await expect(registry.connect(account1).removeAllTokens())
        .to.emit(registry, 'RemoveTokens')
        .withArgs(account1.address, [
          token1.address,
          token2.address,
          token3.address,
        ])

      //NOTE: Note that there are no guarantees on the ordering of values inside the array, and it may change when more values are added or removed.
      // this is why token1, token3, token2 are in the above order
      const tokens = await registry.getSupportedTokens(account1.address)
      expect(tokens.length).to.equal(0)

      const token1Stakers = await registry.getStakersForToken(token1.address)
      const token2Stakers = await registry.getStakersForToken(token2.address)
      const token3Stakers = await registry.getStakersForToken(token3.address)
      expect(token1Stakers.length).to.equal(0)
      expect(token2Stakers.length).to.equal(0)
      expect(token3Stakers.length).to.equal(0)
    })

    it('remove a list of duplicate tokens fails', async () => {
      await stakingToken.mock.transfer.returns(true)
      await stakingToken.mock.transferFrom.returns(true)
      await registry
        .connect(account1)
        .addTokens([token1.address, token2.address, token3.address])

      await expect(
        registry
          .connect(account1)
          .removeTokens([token1.address, token2.address, token1.address])
      ).to.be.revertedWith('TOKEN_DOES_NOT_EXIST')
    })

    it('remove a token already removed fails', async () => {
      await stakingToken.mock.transfer.returns(true)
      await stakingToken.mock.transferFrom.returns(true)
      await registry
        .connect(account1)
        .addTokens([token1.address, token2.address, token3.address])

      await registry
        .connect(account1)
        .removeTokens([token1.address, token2.address, token3.address])

      await expect(
        registry.connect(account1).removeTokens([token1.address])
      ).to.be.revertedWith('TOKEN_DOES_NOT_EXIST')
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
          .addTokens([token1.address, token2.address, token3.address])
      )
        .to.emit(registry, 'AddTokens')
        .withArgs(account1.address, [
          token1.address,
          token2.address,
          token3.address,
        ])

      const urls = await registry.getURLsForToken(token3.address)
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
        .addTokens([token1.address, token2.address, token3.address])

      const balance = await registry.balanceOf(account1.address)
      expect(balance).to.equal(OBLIGATION_COST + TOKEN_COST * 3)
    })

    it('verify expected staking balance after a user has removed tokens', async () => {
      await stakingToken.mock.transfer.returns(true)
      await stakingToken.mock.transferFrom.returns(true)
      await registry
        .connect(account1)
        .addTokens([token1.address, token2.address, token3.address])

      await registry.connect(account1).removeTokens([token2.address])

      const balance = await registry.balanceOf(account1.address)
      expect(balance).to.equal(OBLIGATION_COST + TOKEN_COST * 2)
    })
  })
})
