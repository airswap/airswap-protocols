const { expect } = require('chai')
const {
  createOrder,
  createOrderSignature,
  TokenKinds,
  SECONDS_IN_DAY,
} = require('@airswap/utils')
const { ethers } = require('hardhat')
const ERC20 = require('@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json')
const SWAP = require('@airswap/swap/build/contracts/Swap.sol/Swap.json')
const ERC20_ADAPTER = require('@airswap/swap/build/contracts/adapters/ERC20Adapter.sol/ERC20Adapter.json')
const ERC721_ADAPTER = require('@airswap/swap/build/contracts/adapters/ERC721Adapter.sol/ERC721Adapter.json')
const ERC1155_ADAPTER = require('@airswap/swap/build/contracts/adapters/ERC1155Adapter.sol/ERC1155Adapter.json')
const ERC721_ROYALTY = require('@airswap/swap/build/contracts/test/ERC721Royalty.sol/ERC721Royalty.json')
const ERC1155_PRESET = require('@openzeppelin/contracts/build/contracts/ERC1155PresetMinterPauser.json')

describe('Delegate Integration', () => {
  let snapshotId
  let erc721Token
  let erc1155Token

  let sender
  let signer
  let protocolFeeWallet

  const CHAIN_ID = 31337
  const PROTOCOL_FEE = '30'
  const DEFAULT_SENDER_AMOUNT = '10000'
  const DEFAULT_BALANCE = '1000000'
  const RULE_EXPIRY =
    Math.round(Date.now() / 1000 + SECONDS_IN_DAY).toString() + 1
  const MAX_ROYALTY = '100'

  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  before('get signers and deploy', async () => {
    ;[deployer, sender, signer, protocolFeeWallet] = await ethers.getSigners()

    // Deploy adapters
    erc20Adapter = await (
      await ethers.getContractFactory(ERC20_ADAPTER.abi, ERC20_ADAPTER.bytecode)
    ).deploy()
    await erc20Adapter.deployed()

    erc721Adapter = await (
      await ethers.getContractFactory(
        ERC721_ADAPTER.abi,
        ERC721_ADAPTER.bytecode
      )
    ).deploy()
    await erc721Adapter.deployed()

    erc1155Adapter = await (
      await ethers.getContractFactory(
        ERC1155_ADAPTER.abi,
        ERC1155_ADAPTER.bytecode
      )
    ).deploy()
    await erc1155Adapter.deployed()

    // Deploy Swap contract
    swap = await (
      await ethers.getContractFactory(SWAP.abi, SWAP.bytecode)
    ).deploy(
      [erc20Adapter.address, erc721Adapter.address, erc1155Adapter.address], // adapters
      TokenKinds.ERC20, // requiredSenderKind
      PROTOCOL_FEE,
      protocolFeeWallet.address
    )
    await swap.deployed()

    // Deploy Delegate contract
    delegate = await (
      await ethers.getContractFactory('Delegate')
    ).deploy(
      swap.address,
      erc20Adapter.address,
      erc721Adapter.address,
      erc1155Adapter.address
    )
    await delegate.deployed()

    // Deploy tokens
    erc20Token = await (
      await ethers.getContractFactory(ERC20.abi, ERC20.bytecode)
    ).deploy('A', 'A')
    await erc20Token.deployed()
    // Mint tokens to signer as buyer of the ERC721 token
    await erc20Token.mint(sender.address, DEFAULT_BALANCE)

    // Deploy ERC721 token using the contract factory
    erc721Token = await (
      await ethers.getContractFactory(
        ERC721_ROYALTY.abi,
        ERC721_ROYALTY.bytecode
      )
    ).deploy()
    await erc721Token.deployed()

    // Deploy ERC1155 token using the contract factory
    erc1155Token = await (
      await ethers.getContractFactory(
        ERC1155_PRESET.abi,
        ERC1155_PRESET.bytecode
      )
    ).deploy('Test 4')
    await erc1155Token.deployed()

    await erc721Token.mint(signer.address)
    await erc1155Token.mint(signer.address, '1', '1', '0x00')

    // Approve tokens
    await erc721Token.connect(signer).setApprovalForAll(swap.address, true)
    await erc1155Token.connect(signer).setApprovalForAll(swap.address, true)
    await erc20Token.connect(sender).approve(delegate.address, DEFAULT_BALANCE)
  })

  describe('Test transfers', async () => {
    it('test a delegated swap ERC721 for ERC20', async () => {
      // Create the order for setting the rule - sender is selling ERC721
      const ruleOrder = createOrder({
        nonce: Date.now().toString(),
        expiry: RULE_EXPIRY,
        protocolFee: PROTOCOL_FEE,
        signer: {
          wallet: signer.address,
          token: erc721Token.address, // Sender is selling the ERC721
          kind: TokenKinds.ERC721,
          id: '1',
          amount: '0',
        },
        sender: {
          wallet: delegate.address,
          token: erc20Token.address, // Sender is buying with ERC20
          kind: TokenKinds.ERC20,
          id: '0',
          amount: DEFAULT_SENDER_AMOUNT,
        },
        affiliateWallet: ethers.constants.AddressZero,
        affiliateAmount: '0',
      })

      // Sign the rule order
      const signedRuleOrder = {
        ...ruleOrder,
        ...(await createOrderSignature(
          ruleOrder,
          signer,
          swap.address,
          CHAIN_ID
        )),
      }

      // Set the rule
      await delegate.connect(sender).setRule(signedRuleOrder)

      // Execute the swap
      await expect(
        delegate
          .connect(signer)
          .swap(signedRuleOrder, sender.address, MAX_ROYALTY)
      ).to.emit(delegate, 'DelegatedSwapFor')

      // Verify balances
      expect(await erc721Token.ownerOf('1')).to.equal(sender.address) // Signer gets the ERC721
      expect(await erc20Token.balanceOf(signer.address)).to.equal(
        DEFAULT_SENDER_AMOUNT
      ) // Sender gets the ERC20
      expect(await erc20Token.balanceOf(sender.address)).to.equal(
        DEFAULT_BALANCE - DEFAULT_SENDER_AMOUNT - PROTOCOL_FEE - MAX_ROYALTY
      )
    })

    it('test a delegated swap ERC1155 for ERC20', async () => {
      // Create the order for setting the rule - signer is selling ERC1155
      const ruleOrder = createOrder({
        nonce: Date.now().toString(),
        expiry: RULE_EXPIRY,
        protocolFee: PROTOCOL_FEE,
        signer: {
          wallet: signer.address,
          token: erc1155Token.address, // Signer is selling the ERC1155
          kind: TokenKinds.ERC1155,
          id: '1',
          amount: '1',
        },
        sender: {
          wallet: delegate.address,
          token: erc20Token.address, // Sender is buying with ERC20
          kind: TokenKinds.ERC20,
          id: '0',
          amount: DEFAULT_SENDER_AMOUNT,
        },
        affiliateWallet: ethers.constants.AddressZero,
        affiliateAmount: '0',
      })

      // Sign the rule order
      const signedRuleOrder = {
        ...ruleOrder,
        ...(await createOrderSignature(
          ruleOrder,
          signer,
          swap.address,
          CHAIN_ID
        )),
      }

      // Set the rule
      await delegate.connect(sender).setRule(signedRuleOrder)

      // Execute the swap
      await expect(
        delegate
          .connect(signer)
          .swap(signedRuleOrder, sender.address, MAX_ROYALTY)
      ).to.emit(delegate, 'DelegatedSwapFor')

      // Verify balances
      expect(await erc1155Token.balanceOf(sender.address, '1')).to.equal('1') // Sender gets the ERC1155
      expect(await erc20Token.balanceOf(signer.address)).to.equal(
        DEFAULT_SENDER_AMOUNT
      ) // Signer gets the ERC20
      expect(await erc20Token.balanceOf(sender.address)).to.equal(
        DEFAULT_BALANCE - DEFAULT_SENDER_AMOUNT - PROTOCOL_FEE - MAX_ROYALTY
      )
    })

    it('test a delegated swap multiple ERC1155 for ERC20', async () => {
      // Mint additional ERC1155 tokens to signer
      await erc1155Token.mint(signer.address, '2', '5', '0x00')
      await erc1155Token.mint(signer.address, '3', '10', '0x00')

      // Create the order for setting the rule - signer is selling multiple ERC1155
      const ruleOrder = createOrder({
        nonce: Date.now().toString(),
        expiry: RULE_EXPIRY,
        protocolFee: PROTOCOL_FEE,
        signer: {
          wallet: signer.address,
          token: erc1155Token.address, // Signer is selling the ERC1155
          kind: TokenKinds.ERC1155,
          id: '2',
          amount: '5',
        },
        sender: {
          wallet: delegate.address,
          token: erc20Token.address, // Sender is buying with ERC20
          kind: TokenKinds.ERC20,
          id: '0',
          amount: DEFAULT_SENDER_AMOUNT,
        },
        affiliateWallet: ethers.constants.AddressZero,
        affiliateAmount: '0',
      })

      // Sign the rule order
      const signedRuleOrder = {
        ...ruleOrder,
        ...(await createOrderSignature(
          ruleOrder,
          signer,
          swap.address,
          CHAIN_ID
        )),
      }

      // Set the rule
      await delegate.connect(sender).setRule(signedRuleOrder)

      // Execute the swap
      await expect(
        delegate
          .connect(signer)
          .swap(signedRuleOrder, sender.address, MAX_ROYALTY)
      ).to.emit(delegate, 'DelegatedSwapFor')

      // Verify balances
      expect(await erc1155Token.balanceOf(sender.address, '2')).to.equal('5') // Sender gets 5 ERC1155 tokens with ID 2
      expect(await erc20Token.balanceOf(signer.address)).to.equal(
        DEFAULT_SENDER_AMOUNT
      ) // Signer gets the ERC20
      expect(await erc20Token.balanceOf(sender.address)).to.equal(
        DEFAULT_BALANCE - DEFAULT_SENDER_AMOUNT - PROTOCOL_FEE - MAX_ROYALTY
      )
    })
  })
})
