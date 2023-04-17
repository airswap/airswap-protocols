const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const IERC721 = require('@openzeppelin/contracts/build/contracts/IERC721.json')
const { deployMockContract } = waffle
const { ADDRESS_ZERO, TokenKinds } = require('@airswap/constants')

let snapshotId
let adapter
let party

describe('ERC721Adapter Unit', () => {
  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  before('deploy erc721 transfer handler', async () => {
    ;[deployer, anyone] = await ethers.getSigners()
    token = await deployMockContract(deployer, IERC721.abi)
    adapter = await (await ethers.getContractFactory('ERC721Adapter')).deploy()
    await adapter.deployed()
    party = {
      wallet: ADDRESS_ZERO,
      token: token.address,
      kind: TokenKinds.ERC721,
      id: '1',
      amount: '0',
    }
  })

  it('hasAllowance succeeds', async () => {
    await token.mock.getApproved.withArgs(party.id).returns(adapter.address)
    expect(await adapter.connect(anyone).hasAllowance(party)).to.be.equal(true)
  })

  it('hasAllowance fails for wrong address', async () => {
    await token.mock.getApproved.withArgs(party.id).returns(anyone.address)
    expect(await adapter.connect(anyone).hasAllowance(party)).to.be.equal(false)
  })

  it('hasBalance succeeds', async () => {
    await token.mock.ownerOf.returns(party.wallet)
    expect(await adapter.hasBalance(party)).to.be.equal(true)
  })

  it('transfer succeeds', async () => {
    await token.mock['safeTransferFrom(address,address,uint256)'].returns()
    await expect(
      adapter
        .connect(anyone)
        .transfer(
          party.wallet,
          anyone.address,
          party.amount,
          party.id,
          party.token
        )
    ).to.not.be.reverted
  })

  it('transfer with nonzero amount fails', async () => {
    await token.mock['safeTransferFrom(address,address,uint256)'].returns()
    await expect(
      adapter
        .connect(anyone)
        .transfer(party.wallet, anyone.address, '1', party.id, party.token)
    ).to.be.revertedWith('InvalidArgument("amount")')
  })
})
