const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')
const { deployMockContract } = waffle
const { ADDRESS_ZERO, tokenKinds } = require('@airswap/constants')

let snapshotId
let transferHandler
let party

describe('ERC20TransferHandler Unit', () => {
  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  before('deploy erc20 transfer handler', async () => {
    ;[deployer, swap, anyone] = await ethers.getSigners()
    erc20token = await deployMockContract(deployer, IERC20.abi)
    transferHandler = await (
      await ethers.getContractFactory('ERC20TransferHandler')
    ).deploy()
    await transferHandler.deployed()
    party = {
      wallet: ADDRESS_ZERO,
      token: erc20token.address,
      kind: tokenKinds.ERC20,
      id: '0',
      amount: '1',
    }
  })

  it('attemptFeeTransfer is true', async () => {
    expect(await transferHandler.attemptFeeTransfer()).to.be.equal(true)
  })

  it('hasAllowance succeeds', async () => {
    await erc20token.mock.allowance
      .withArgs(party.wallet, swap.address)
      .returns('1')
    expect(await transferHandler.connect(swap).hasAllowance(party)).to.be.equal(
      true
    )
  })

  it('hasBalance succeeds', async () => {
    await erc20token.mock.balanceOf.returns('1')
    expect(await transferHandler.hasBalance(party)).to.be.equal(true)
  })

  it('transferTokens succeeds', async () => {
    await erc20token.mock.transferFrom.returns(true)
    await expect(
      transferHandler
        .connect(swap)
        .transferTokens(
          party.wallet,
          anyone.address,
          party.amount,
          party.id,
          party.token
        )
    ).not.to.be.reverted
  })

  it('transferTokens with nonzero id fails', async () => {
    await erc20token.mock.transferFrom.returns(true)
    await expect(
      transferHandler
        .connect(swap)
        .transferTokens(
          party.wallet,
          anyone.address,
          party.amount,
          '1',
          party.token
        )
    ).to.be.revertedWith('InvalidArgument("id")')
  })
})
