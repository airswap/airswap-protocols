const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')
const { deployMockContract } = waffle
const { ADDRESS_ZERO, TokenKinds } = require('@airswap/constants')

let snapshotId
let adapter
let party

describe('ERC20Adapter Unit', () => {
  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  before('deploy erc20 transfer handler', async () => {
    ;[deployer, anyone] = await ethers.getSigners()
    token = await deployMockContract(deployer, IERC20.abi)
    adapter = await (await ethers.getContractFactory('ERC20Adapter')).deploy()
    await adapter.deployed()
    party = {
      wallet: ADDRESS_ZERO,
      token: token.address,
      kind: TokenKinds.ERC20,
      id: '0',
      amount: '1',
    }
  })

  it('hasAllowance succeeds', async () => {
    await token.mock.allowance
      .withArgs(party.wallet, anyone.address)
      .returns('1')
    expect(await adapter.connect(anyone).hasAllowance(party)).to.be.equal(true)
  })

  it('hasAllowance fails for wrong address', async () => {
    await token.mock.allowance
      .withArgs(party.wallet, anyone.address)
      .returns('0')
    await token.mock.allowance
      .withArgs(party.wallet, deployer.address)
      .returns('1')
    expect(await adapter.connect(anyone).hasAllowance(party)).to.be.equal(false)
  })

  it('hasBalance succeeds', async () => {
    await token.mock.balanceOf.returns('1')
    expect(await adapter.hasBalance(party)).to.be.equal(true)
  })

  it('transfer succeeds', async () => {
    await token.mock.transferFrom.returns(true)
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
    ).not.to.be.reverted
  })

  it('transfer with nonzero id fails', async () => {
    await token.mock.transferFrom.returns(true)
    await expect(
      adapter
        .connect(anyone)
        .transfer(party.wallet, anyone.address, party.amount, '1', party.token)
    ).to.be.revertedWith('InvalidArgument("id")')
  })
})
