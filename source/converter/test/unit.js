const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const { deployMockContract } = waffle
const { ADDRESS_ZERO } = require('@airswap/constants')
const UniswapV2Router02 = require('@uniswap/v2-periphery/build/IUniswapV2Router02.json')
const IERC20 = require('@openzeppelin/contracts/build/contracts/IERC20.json')

describe('Converter Unit Tests', () => {
  let snapshotId
  let deployer
  let account1
  let account2
  let testAToken
  let testBToken
  let swapToToken
  let uniswapV2Router02Contract
  let converter
  const wETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
  const triggerFee = 1
  const payees = ['0x7296333e1615721f4Bd9Df1a3070537484A50CF8']
  const shares = [10]
  const MINAMOUNTOUT = 1

  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  before(async () => {
    ;[deployer, account1, account2] = await ethers.getSigners()

    testAToken = await deployMockContract(deployer, IERC20.abi)

    testBToken = await deployMockContract(deployer, IERC20.abi)

    swapToToken = await deployMockContract(deployer, IERC20.abi)

    uniswapV2Router02Contract = await deployMockContract(
      deployer,
      UniswapV2Router02.abi
    )

    const Converter = await ethers.getContractFactory('Converter')
    converter = await Converter.deploy(
      wETH,
      swapToToken.address,
      uniswapV2Router02Contract.address,
      triggerFee,
      payees,
      shares
    )
    await converter.deployed()
  })

  describe('Default Values', async () => {
    it('constructor sets default values', async () => {
      const owner = await converter.owner()
      const swapToTokenAddress = await converter.swapToToken()
      const uniRouterAddress = await converter.uniRouter()
      const triggerFeeAmount = await converter.triggerFee()
      const payeesAddress = await converter.payee(0)
      const sharesAmount = await converter.shares(payeesAddress)

      expect(owner).to.equal(deployer.address)
      expect(swapToTokenAddress).to.equal(swapToToken.address)
      expect(uniRouterAddress).to.equal(uniswapV2Router02Contract.address)
      expect(triggerFeeAmount).to.equal(triggerFee)
      expect(payeesAddress).to.equal(payees[0])
      expect(sharesAmount).to.equal(shares[0])
    })
  })

  describe('Deploy payment splitter contract', async () => {
    it('contract cannot deploy if payees and shares_ do not match in length', async () => {
      const Converter = await ethers.getContractFactory('Converter')
      await expect(
        Converter.deploy(
          wETH,
          swapToToken.address,
          uniswapV2Router02Contract.address,
          triggerFee,
          payees,
          [10, 1]
        )
      ).to.be.revertedWith(
        'TokenPaymentSplitter: payees and shares length mismatch'
      )
    })
    it('contract cannot deploy if payees length is zero', async () => {
      const Converter = await ethers.getContractFactory('Converter')
      await expect(
        Converter.deploy(
          wETH,
          swapToToken.address,
          uniswapV2Router02Contract.address,
          triggerFee,
          [],
          []
        )
      ).to.be.revertedWith('TokenPaymentSplitter: no payees')
    })
  })

  describe('Set swapToToken', async () => {
    it('non owner cannot set swapToToken', async () => {
      await expect(
        converter
          .connect(account1)
          .setSwapToToken('0x6B175474E89094C44Da98b954EedeAC495271d0F')
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('owner cannot set swapToToken to zero address', async () => {
      await expect(
        converter.connect(deployer).setSwapToToken(ADDRESS_ZERO)
      ).to.be.revertedWith('MUST_BE_VALID_ADDRESS')
    })

    it('owner can set swapToToken', async () => {
      await converter
        .connect(deployer)
        .setSwapToToken('0x6B175474E89094C44Da98b954EedeAC495271d0F')

      const swapToTokenAddress = await converter.swapToToken()
      expect(swapToTokenAddress).to.equal(
        '0x6B175474E89094C44Da98b954EedeAC495271d0F'
      )
    })
  })

  describe('Set WETH', async () => {
    it('non owner cannot set WETH', async () => {
      await expect(
        converter
          .connect(account1)
          .setWETH('0x6B175474E89094C44Da98b954EedeAC495271d0F')
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('owner cannot set WETH to zero address', async () => {
      await expect(
        converter.connect(deployer).setWETH(ADDRESS_ZERO)
      ).to.be.revertedWith('MUST_BE_VALID_ADDRESS')
    })

    it('owner can set WETH', async () => {
      await converter
        .connect(deployer)
        .setWETH('0x6B175474E89094C44Da98b954EedeAC495271d0F')

      const setWETH = await converter.wETH()
      expect(setWETH).to.equal('0x6B175474E89094C44Da98b954EedeAC495271d0F')
    })
  })

  describe('Set triggerFee', async () => {
    it('non owner cannot set triggerFee', async () => {
      await expect(
        converter.connect(account1).setTriggerFee(2)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('owner cannot set triggerFee greater than 100', async () => {
      await expect(
        converter.connect(deployer).setTriggerFee(101)
      ).to.be.revertedWith('FEE_TOO_HIGH')
    })

    it('owner can set triggerFee', async () => {
      await converter.connect(deployer).setTriggerFee(2)

      const triggerFeeNum = await converter.triggerFee()
      expect(triggerFeeNum).to.equal(2)
    })
  })

  describe('Set tokenPath', async () => {
    it('non owner cannot set tokenPath', async () => {
      const path = [testAToken.address, testBToken.address, swapToToken.address]
      await expect(
        converter
          .connect(account1)
          .setTokenPath('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', path)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('owner can set tokenPath', async () => {
      const aAddress = testAToken.address
      const bAddress = testBToken.address
      const cAddress = swapToToken.address
      const path = [aAddress, bAddress, cAddress]
      await converter.connect(deployer).setTokenPath(aAddress, path)

      const _tokenPath = await converter.getTokenPath(aAddress)
      expect(_tokenPath[0]).to.equal(testAToken.address)
      expect(_tokenPath[1]).to.equal(testBToken.address)
      expect(_tokenPath[2]).to.equal(swapToToken.address)
    })
  })

  describe('Add Payee', async () => {
    const payeeAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
    const payeeShares = 5
    it('non owner cannot add payee', async () => {
      await expect(
        converter.connect(account1).addPayee(payeeAddress, payeeShares)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('owner cannot add payee if they are already included in payee array', async () => {
      const existingPayee = await converter.connect(deployer).payee(0)
      await expect(
        converter.connect(deployer).addPayee(existingPayee, payeeShares)
      ).to.be.revertedWith('PaymentSplitter: account already has shares')
    })

    it('owner cannot add payee with zero shares', async () => {
      await expect(
        converter.connect(deployer).addPayee(payeeAddress, 0)
      ).to.be.revertedWith('PaymentSplitter: shares are 0')
    })

    it('owner cannot add payee with zero address', async () => {
      await expect(
        converter.connect(deployer).addPayee(ADDRESS_ZERO, payeeShares)
      ).to.be.revertedWith('TokenPaymentSplitter: account is the zero address')
    })

    it('owner can add payee', async () => {
      const beginningTotalShares = await converter
        .connect(deployer)
        .totalShares()

      await converter.connect(deployer).addPayee(payeeAddress, payeeShares)

      const newPayeeAddress = await converter.payee(1)
      const newPayeeShares = await converter.shares(newPayeeAddress)
      const endingTotalShares = await converter.totalShares()
      expect(newPayeeAddress).to.equal(
        '0x6B175474E89094C44Da98b954EedeAC495271d0F'
      )
      expect(newPayeeShares).to.equal(5)
      expect(endingTotalShares).to.equal(
        parseFloat(beginningTotalShares) + parseFloat(payeeShares)
      )
    })
  })

  describe('Remove Payee', async () => {
    const correctPayeeIndex = 0
    const incorrectPayeeIndex = 1
    it('non owner cannot remove payee', async () => {
      const correctPayeeAddress = await converter.payee(0)
      await expect(
        converter
          .connect(account1)
          .removePayee(correctPayeeAddress, correctPayeeIndex)
      ).to.be.revertedWith('Ownable: caller is not the owner')
    })

    it('owner cannot remove payee if they are not on payee array', async () => {
      const incorrectPayeeAddress = account2.address
      await expect(
        converter
          .connect(deployer)
          .removePayee(incorrectPayeeAddress, correctPayeeIndex)
      ).to.be.revertedWith(
        'PaymentSplitter: account does not match payee array index'
      )
    })

    it('owner cannot remove payee if provided wrong payee index for payee array', async () => {
      const correctPayeeAddress = await converter.payee(0)
      await expect(
        converter
          .connect(deployer)
          .removePayee(correctPayeeAddress, incorrectPayeeIndex)
      ).to.be.revertedWith('PaymentSplitter: index not in payee array')
    })

    it('owner can remove payee', async () => {
      const correctPayeeAddress = await converter.payee(0)
      await converter
        .connect(deployer)
        .removePayee(correctPayeeAddress, correctPayeeIndex)

      const removedPayeeShares = await converter.shares(correctPayeeAddress)
      const endingTotalShares = await converter.totalShares()
      await expect(converter.payee(0)).to.be.revertedWith(
        'PaymentSplitter: There are no payees'
      )
      expect(removedPayeeShares).to.equal(0)
      expect(endingTotalShares).to.equal(0)
    })
  })

  describe('Convert and transfer', async () => {
    it('user can convert and transfer any token along a preset Uniswap pool path', async () => {
      const aAddress = testAToken.address
      const bAddress = testBToken.address
      const cAddress = swapToToken.address
      const path = [aAddress, bAddress, cAddress]
      await converter.connect(deployer).setTokenPath(aAddress, path)

      const testATokenStartingBalance = 25000

      await testAToken.mock.balanceOf
        .withArgs(converter.address)
        .returns(testATokenStartingBalance)

      await testAToken.mock.approve
        .withArgs(uniswapV2Router02Contract.address, testATokenStartingBalance)
        .returns(true)
      await testAToken.mock.allowance
        .withArgs(converter.address, uniswapV2Router02Contract.address)
        .returns(0)
      await uniswapV2Router02Contract.mock.swapExactTokensForTokensSupportingFeeOnTransferTokens.returns()

      const swapToTokenReturnBalance = 25000

      await swapToToken.mock.transfer.returns(true)

      await swapToToken.mock.balanceOf
        .withArgs(converter.address)
        .returns(swapToTokenReturnBalance)

      const triggerAmount = (swapToTokenReturnBalance * triggerFee) / 100
      await swapToToken.mock.balanceOf
        .withArgs(deployer.address)
        .returns(triggerAmount)

      await swapToToken.mock.balanceOf
        .withArgs(payees[0])
        .returns(swapToTokenReturnBalance - triggerAmount)

      await expect(
        converter
          .connect(deployer)
          .convertAndTransfer(testAToken.address, MINAMOUNTOUT)
      )
        .to.emit(converter, 'ConvertAndTransfer')
        .withArgs(
          deployer.address,
          testAToken.address,
          swapToToken.address,
          25000,
          24750,
          payees
        )

      const testATokenEndingBalance = swapToTokenReturnBalance - 25000

      await testAToken.mock.balanceOf
        .withArgs(converter.address)
        .returns(testATokenEndingBalance)

      const converterTokenABalance = await testAToken.balanceOf(
        converter.address
      )
      const msgSenderSwapToTokenBalance = await swapToToken.balanceOf(
        deployer.address
      )
      const payeeSwapToTokenBalance = await swapToToken.balanceOf(payees[0])

      expect(converterTokenABalance).to.equal(0)
      expect(msgSenderSwapToTokenBalance).to.equal(250)
      expect(payeeSwapToTokenBalance).to.equal(24750)
    })

    it('user can convert and transfer any token without a preset Uniswap pool path', async () => {
      const testATokenStartingBalance = 25000

      await testAToken.mock.balanceOf
        .withArgs(converter.address)
        .returns(testATokenStartingBalance)

      await testAToken.mock.approve
        .withArgs(uniswapV2Router02Contract.address, testATokenStartingBalance)
        .returns(true)
      await testAToken.mock.allowance
        .withArgs(converter.address, uniswapV2Router02Contract.address)
        .returns(0)
      await uniswapV2Router02Contract.mock.swapExactTokensForTokensSupportingFeeOnTransferTokens.returns()

      const swapToTokenReturnBalance = 25000

      await swapToToken.mock.transfer.returns(true)

      await swapToToken.mock.balanceOf
        .withArgs(converter.address)
        .returns(swapToTokenReturnBalance)

      const triggerAmount = (swapToTokenReturnBalance * triggerFee) / 100
      await swapToToken.mock.balanceOf
        .withArgs(deployer.address)
        .returns(triggerAmount)

      await swapToToken.mock.balanceOf
        .withArgs(payees[0])
        .returns(swapToTokenReturnBalance - triggerAmount)

      await expect(
        converter
          .connect(deployer)
          .convertAndTransfer(testAToken.address, MINAMOUNTOUT)
      )
        .to.emit(converter, 'ConvertAndTransfer')
        .withArgs(
          deployer.address,
          testAToken.address,
          swapToToken.address,
          25000,
          24750,
          payees
        )

      const testATokenEndingBalance = swapToTokenReturnBalance - 25000

      await testAToken.mock.balanceOf
        .withArgs(converter.address)
        .returns(testATokenEndingBalance)

      const converterTokenABalance = await testAToken.balanceOf(
        converter.address
      )
      const msgSenderSwapToTokenBalance = await swapToToken.balanceOf(
        deployer.address
      )
      const payeeSwapToTokenBalance = await swapToToken.balanceOf(payees[0])

      expect(converterTokenABalance).to.equal(0)
      expect(msgSenderSwapToTokenBalance).to.equal(250)
      expect(payeeSwapToTokenBalance).to.equal(24750)
    })

    it('user can convert and transfer any token without a preset Uniswap pool path if swapToToken is WETH', async () => {
      await converter.connect(deployer).setWETH(swapToToken.address)

      const testATokenStartingBalance = 25000

      await testAToken.mock.balanceOf
        .withArgs(converter.address)
        .returns(testATokenStartingBalance)

      await testAToken.mock.approve
        .withArgs(uniswapV2Router02Contract.address, testATokenStartingBalance)
        .returns(true)
      await testAToken.mock.allowance
        .withArgs(converter.address, uniswapV2Router02Contract.address)
        .returns(0)
      await uniswapV2Router02Contract.mock.swapExactTokensForTokensSupportingFeeOnTransferTokens.returns()

      const swapToTokenReturnBalance = 25000

      await swapToToken.mock.transfer.returns(true)

      await swapToToken.mock.balanceOf
        .withArgs(converter.address)
        .returns(swapToTokenReturnBalance)

      const triggerAmount = (swapToTokenReturnBalance * triggerFee) / 100
      await swapToToken.mock.balanceOf
        .withArgs(deployer.address)
        .returns(triggerAmount)

      await swapToToken.mock.balanceOf
        .withArgs(payees[0])
        .returns(swapToTokenReturnBalance - triggerAmount)

      await expect(
        converter
          .connect(deployer)
          .convertAndTransfer(testAToken.address, MINAMOUNTOUT)
      )
        .to.emit(converter, 'ConvertAndTransfer')
        .withArgs(
          deployer.address,
          testAToken.address,
          swapToToken.address,
          25000,
          24750,
          payees
        )

      const testATokenEndingBalance = swapToTokenReturnBalance - 25000

      await testAToken.mock.balanceOf
        .withArgs(converter.address)
        .returns(testATokenEndingBalance)

      const converterTokenABalance = await testAToken.balanceOf(
        converter.address
      )
      const msgSenderSwapToTokenBalance = await swapToToken.balanceOf(
        deployer.address
      )
      const payeeSwapToTokenBalance = await swapToToken.balanceOf(payees[0])

      expect(converterTokenABalance).to.equal(0)
      expect(msgSenderSwapToTokenBalance).to.equal(250)
      expect(payeeSwapToTokenBalance).to.equal(24750)
    })

    it('user can transfer swapToToken', async () => {
      const swapToTokenStartingBalance = 25000

      await swapToToken.mock.approve.returns(true)

      await swapToToken.mock.transfer.returns(true)

      await swapToToken.mock.balanceOf
        .withArgs(converter.address)
        .returns(swapToTokenStartingBalance)

      await expect(
        converter
          .connect(deployer)
          .convertAndTransfer(swapToToken.address, MINAMOUNTOUT)
      )
        .to.emit(converter, 'ConvertAndTransfer')
        .withArgs(
          deployer.address,
          swapToToken.address,
          swapToToken.address,
          25000,
          24750,
          payees
        )

      await swapToToken.mock.balanceOf.withArgs(converter.address).returns(0)

      const triggerAmount = (swapToTokenStartingBalance * triggerFee) / 100
      await swapToToken.mock.balanceOf
        .withArgs(deployer.address)
        .returns(triggerAmount)

      await swapToToken.mock.balanceOf
        .withArgs(payees[0])
        .returns(swapToTokenStartingBalance - triggerAmount)

      const converterSwapToTokenBalance = await swapToToken.balanceOf(
        converter.address
      )
      const msgSenderSwapToTokenBalance = await swapToToken.balanceOf(
        deployer.address
      )
      const payeeSwapToTokenBalance = await swapToToken.balanceOf(payees[0])

      expect(converterSwapToTokenBalance).to.equal(0)
      expect(msgSenderSwapToTokenBalance).to.equal(250)
      expect(payeeSwapToTokenBalance).to.equal(24750)
    })

    it('user cannot convert and transfer a token if approval fails', async () => {
      const testATokenStartingBalance = 25000

      await testAToken.mock.balanceOf
        .withArgs(converter.address)
        .returns(testATokenStartingBalance)

      await testAToken.mock.approve
        .withArgs(uniswapV2Router02Contract.address, testATokenStartingBalance)
        .returns(false)
      await testAToken.mock.allowance
        .withArgs(converter.address, uniswapV2Router02Contract.address)
        .returns(0)

      await expect(
        converter
          .connect(deployer)
          .convertAndTransfer(testAToken.address, MINAMOUNTOUT)
      ).to.be.revertedWith('SafeERC20: ERC20 operation did not succeed')
    })

    it('user cannot convert and transfer a token with a balance of zero', async () => {
      const testATokenStartingBalance = 0

      await testAToken.mock.balanceOf
        .withArgs(converter.address)
        .returns(testATokenStartingBalance)

      await expect(
        converter
          .connect(deployer)
          .convertAndTransfer(testAToken.address, MINAMOUNTOUT)
      ).to.revertedWith('NO_BALANCE_TO_CONVERT')
    })

    it('user cannot convert and transfer a token with an _amountOutMin of zero', async () => {
      const _amountOutMin = 0

      await expect(
        converter
          .connect(deployer)
          .convertAndTransfer(testAToken.address, _amountOutMin)
      ).to.revertedWith('INVALID_AMOUNT_OUT')
    })

    it('user cannot convert and transfer a token if payees are zero', async () => {
      const payeeAddress = await converter.payee(0)
      await converter.connect(deployer).removePayee(payeeAddress, 0)

      await expect(
        converter
          .connect(deployer)
          .convertAndTransfer(testAToken.address, MINAMOUNTOUT)
      ).to.revertedWith('PAYEES_MUST_BE_SET')
    })
  })

  describe('Drain to', () => {
    it('drains specified tokens held in the contract to a specified address', async () => {
      const aAddress = testAToken.address
      const bAddress = testBToken.address
      const cAddress = swapToToken.address
      const tokenAddresses = [aAddress, bAddress, cAddress]
      const tokenStartingBalance = 25000

      await testAToken.mock.balanceOf
        .withArgs(converter.address)
        .returns(tokenStartingBalance)
      await testBToken.mock.balanceOf.withArgs(converter.address).returns(0)
      await swapToToken.mock.balanceOf
        .withArgs(converter.address)
        .returns(tokenStartingBalance)

      await testAToken.mock.transfer
        .withArgs(account1.address, tokenStartingBalance)
        .returns(true)
      await testBToken.mock.transfer.withArgs(account1.address, 0).returns(true)
      await swapToToken.mock.transfer
        .withArgs(account1.address, tokenStartingBalance)
        .returns(true)

      await expect(converter.drainTo(account1.address, tokenAddresses))
        .to.emit(converter, 'DrainTo')
        .withArgs([aAddress, bAddress, cAddress], account1.address)
    })
  })
})
