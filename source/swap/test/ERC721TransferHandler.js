const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const IERC721 = require('@openzeppelin/contracts/build/contracts/IERC721.json')
const { deployMockContract } = waffle
const { ADDRESS_ZERO, tokenKinds } = require('@airswap/constants')

let snapshotId
let transferHandler
let party

describe('ERC721TransferHandler Unit', () => {
  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  before('deploy erc721 transfer handler', async () => {
    ;[deployer, swap, anyone] = await ethers.getSigners()
    token = await deployMockContract(deployer, IERC721.abi)
    transferHandler = await (
      await ethers.getContractFactory('ERC721TransferHandler')
    ).deploy()
    await transferHandler.deployed()
    party = {
      wallet: ADDRESS_ZERO,
      token: token.address,
      kind: tokenKinds.ERC721,
      id: '1',
      amount: '0',
    }
  })

  it('attemptFeeTransfer is false', async () => {
    expect(await transferHandler.attemptFeeTransfer()).to.be.equal(false)
  })

  it('hasAllowance succeeds', async () => {
    await token.mock.isApprovedForAll
      .withArgs(party.wallet, swap.address)
      .returns(true)
    expect(await transferHandler.connect(swap).hasAllowance(party)).to.be.equal(
      true
    )
  })

  it('hasBalance succeeds', async () => {
    await token.mock.ownerOf.returns(party.wallet)
    expect(await transferHandler.hasBalance(party)).to.be.equal(true)
  })

  it('transferTokens succeeds', async () => {
    await token.mock['safeTransferFrom(address,address,uint256)'].returns()
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
    ).to.not.be.reverted
  })

  it('transferTokens with nonzero amount fails', async () => {
    await token.mock['safeTransferFrom(address,address,uint256)'].returns()
    await expect(
      transferHandler
        .connect(swap)
        .transferTokens(
          party.wallet,
          anyone.address,
          '1',
          party.id,
          party.token
        )
    ).to.be.revertedWith('InvalidArgument("amount")')
  })
})
