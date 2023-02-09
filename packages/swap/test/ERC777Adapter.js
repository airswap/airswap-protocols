const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const IERC777 = require('@openzeppelin/contracts/build/contracts/IERC777.json')
const { deployMockContract } = waffle
const { ADDRESS_ZERO, tokenKinds } = require('@airswap/constants')

let snapshotId
let adapter
let party

describe('ERC777Adapter Unit', () => {
  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  before('deploy erc777 transfer handler', async () => {
    ;[deployer, anyone] = await ethers.getSigners()
    token = await deployMockContract(deployer, IERC777.abi)
    adapter = await (await ethers.getContractFactory('ERC777Adapter')).deploy()
    await adapter.deployed()
    party = {
      wallet: ADDRESS_ZERO,
      token: token.address,
      kind: tokenKinds.ERC777,
      id: '0',
      amount: '1',
    }
  })

  it('implementsEIP2981 is false', async () => {
    expect(await adapter.implementsEIP2981(party.token)).to.be.equal(false)
  })

  it('getRoyaltyInfo returns (address(0), 0)', async () => {
    let royaltyInfo = await adapter.getRoyaltyInfo(
      party.token,
      party.id,
      party.amount
    )
    expect(royaltyInfo[0]).to.be.equal(ADDRESS_ZERO)
    expect(royaltyInfo[1].toString()).to.be.equal('0')
  })

  it('hasAllowance succeeds', async () => {
    await token.mock.isOperatorFor
      .withArgs(adapter.address, party.wallet)
      .returns(true)
    expect(await adapter.connect(anyone).hasAllowance(party)).to.be.equal(true)
  })

  it('hasBalance succeeds', async () => {
    await token.mock.balanceOf.returns(party.amount)
    expect(await adapter.hasBalance(party)).to.be.equal(true)
  })

  it('transferTokens succeeds', async () => {
    await token.mock.operatorSend.returns()
    await expect(
      adapter
        .connect(anyone)
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
    await token.mock.operatorSend.returns()
    await expect(
      adapter
        .connect(anyone)
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
