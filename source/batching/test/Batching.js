const { expect } = require('chai')
const { time } = require('@nomicfoundation/hardhat-network-helpers')
const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')
const IERC721 = require('@openzeppelin/contracts/build/contracts/ERC721Royalty.json')
const SWAP = require('@airswap/swap/build/contracts/Swap.sol')
const SWAP_ERC20 = require('@airswap/swap-erc20/build/contracts/SwapERC20.sol')
const ERC20_ADAPTER = require('@airswap/swap/build/contracts/adapters/ERC20Adapter.sol')
const ERC721_ADAPTER = require('@airswap/swap/build/contracts/adapters/ERC721Adapter.sol')
const ERC1155_ADAPTER = require('@airswap/swap/build/contracts/adapters/ERC1155Adapter.sol')
const { createOrder, createOrderSignature } = require('@airswap/utils')
const { TokenKinds, ADDRESS_ZERO } = require('@airswap/constants')

const CHAIN_ID = 31337
const PROTOCOL_FEE = '30'
const HIGHER_FEE = '50'
const INVALID_FEE = '100000000000'
const INVALID_KIND = '0x00000000'
const DEFAULT_AMOUNT = '1000'
const ERC2981_INTERFACE_ID = '0x2a55205a'
const MAX_ROYALTY = '10'

let snapshotId
let deployer
let signer
let sender
let affiliate
let erc20token
let erc20adapter
let erc721token
let erc721adapter
let swap

async function signOrder(order, wallet, swapContract) {
  return {
    ...order,
    ...(await createOrderSignature(order, wallet, swapContract, CHAIN_ID)),
  }
}

async function createSignedOrder(params, signatory) {
  const unsignedOrder = createOrder({
    protocolFee: PROTOCOL_FEE,
    ...params,
    signer: {
      wallet: signer.address,
      token: erc20token.address,
      kind: TokenKinds.ERC20,
      id: '0',
      amount: DEFAULT_AMOUNT,
      ...params.signer,
    },
    sender: {
      wallet: sender.address,
      token: erc20token.address,
      kind: TokenKinds.ERC20,
      id: '0',
      amount: DEFAULT_AMOUNT,
      ...params.sender,
    },
  })
  return await signOrder(unsignedOrder, signatory, swap.address, CHAIN_ID)
}

describe('Swap Unit', () => {
  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  //   stakingContract = await (
  //   await ethers.getContractFactory(STAKING.abi, STAKING.bytecode)
  // ).deploy('StakedAST', 'sAST', feeToken.address, 100, 10)
  // await stakingContract.deployed()

  before('deploy adapter and swap', async () => {
    ;[deployer, sender, signer, affiliate, protocolFeeWallet, anyone] =
      await ethers.getSigners()
    erc20token = await deployMockContract(deployer, IERC20.abi)
    await erc20token.mock.allowance.returns(DEFAULT_AMOUNT)
    await erc20token.mock.balanceOf.returns(DEFAULT_AMOUNT)
    await erc20token.mock.transferFrom.returns(true)
    erc20adapter = await (
      await ethers.getContractFactory(ERC20_ADAPTER.abi, ERC20_ADAPTER.bytecode)
    ).deploy()
    await erc20adapter.deployed()

    erc721token = await deployMockContract(deployer, IERC721.abi)
    await erc721token.mock.isApprovedForAll.returns(true)
    await erc721token.mock.ownerOf.returns(sender.address)
    await erc721token.mock[
      'safeTransferFrom(address,address,uint256)'
    ].returns()
    erc721adapter = await (
      await ethers.getContractFactory(
        ERC721_ADAPTER.abi,
        ERC721_ADAPTER.bytecode
      )
    ).deploy()
    await erc721adapter.deployed()
    swap = await (
      await ethers.getContractFactory(SWAP.abi, SWAP.bytcode)
    ).deploy(
      [erc20adapter.address, erc721adapter.address],
      TokenKinds.ERC20,
      PROTOCOL_FEE,
      protocolFeeWallet.address
    )
    await swap.deployed()

    swap = await (
      await ethers.getContractFactory('SwapERC20')
    ).deploy(
      PROTOCOL_FEE,
      PROTOCOL_FEE_LIGHT,
      protocolFeeWallet.address,
      DISCOUNT_SCALE,
      DISCOUNT_MAX
    )

    swapERC20 = await (
      await ethers.getContractFactory(SWAP_ERC20.abi, SWAP_ERC20.bytcode)
    ).deploy(
      PROTOCOL_FEE,
      PROTOCOL_FEE_LIGHT,
      protocolFeeWallet.address,
      DISCOUNT_SCALE,
      DISCOUNT_MAX
    )
    await swapERC20.deployed()
  })

  describe('nonces, expiry, signatures', () => {
    it('a successful swap marks an order nonce used', async () => {
      // const order = await createSignedOrder({}, signer)
      // await expect(
      //   swap.connect(sender).swap(sender.address, MAX_ROYALTY, order)
      // ).to.emit(swap, 'Swap')
      // expect(
      //   await swap.connect(sender).nonceUsed(signer.address, order.nonce)
      // ).to.equal(true)
    })
  })
})
