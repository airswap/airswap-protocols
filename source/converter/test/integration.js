const { expect } = require('chai')
const { ethers } = require('hardhat')

const { uniswapRouterAddress } = require('@airswap/constants')
const UniswapV2Router02Contract = require('@uniswap/v2-periphery/build/IUniswapV2Router02.json')
const ERC20 = require('@openzeppelin/contracts/build/contracts/ERC20PresetMinterPauser.json')

describe('Converter Integration Tests', () => {
  let snapshotId
  let deployer
  let payeeA
  let payeeB
  let payeeC
  let payeeD
  let testAToken
  let testBToken
  let swapToToken
  let uniswapV2Router02Contract
  let converter
  const wETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
  const triggerFee = 1
  const shares = [10]
  const MINAMOUNTOUT = 1

  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot')
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  before(async () => {
    ;[deployer, payeeA, payeeB, payeeC, payeeD] = await ethers.getSigners()

    const TestAToken = await ethers.getContractFactory(
      ERC20.abi,
      ERC20.bytecode
    )
    testAToken = await TestAToken.deploy('TestAToken', 'TESTA')
    await testAToken.deployed()

    await testAToken.mint(deployer.address, 1000000)

    const TestBToken = await ethers.getContractFactory(
      ERC20.abi,
      ERC20.bytecode
    )
    testBToken = await TestBToken.deploy('TestBToken', 'TESTB')
    await testBToken.deployed()

    await testBToken.mint(deployer.address, 1000000)

    const SwapToToken = await ethers.getContractFactory(
      ERC20.abi,
      ERC20.bytecode
    )
    swapToToken = await SwapToToken.deploy('SwapToToken', 'SWAPTO')
    await swapToToken.deployed()

    await swapToToken.mint(deployer.address, 1000000)

    uniswapV2Router02Contract = new ethers.Contract(
      uniswapRouterAddress,
      UniswapV2Router02Contract.abi,
      deployer
    )

    testAToken.approve(uniswapV2Router02Contract.address, 1000000)
    await testBToken.approve(uniswapV2Router02Contract.address, 1000000)
    await swapToToken.approve(uniswapV2Router02Contract.address, 1000000)

    await uniswapV2Router02Contract.addLiquidity(
      testAToken.address,
      testBToken.address,
      250000,
      250000,
      250000,
      250000,
      deployer.address,
      1700000000
    )

    await uniswapV2Router02Contract.addLiquidity(
      testAToken.address,
      swapToToken.address,
      250000,
      250000,
      250000,
      250000,
      deployer.address,
      1700000000
    )

    await uniswapV2Router02Contract.addLiquidity(
      testBToken.address,
      swapToToken.address,
      250000,
      250000,
      250000,
      250000,
      deployer.address,
      1700000000
    )

    await uniswapV2Router02Contract.addLiquidityETH(
      testAToken.address,
      250000,
      250000,
      250000,
      deployer.address,
      1700000000,
      { value: 250000 }
    )

    await uniswapV2Router02Contract.addLiquidityETH(
      testBToken.address,
      250000,
      250000,
      250000,
      deployer.address,
      1700000000,
      { value: 250000 }
    )

    await uniswapV2Router02Contract.addLiquidityETH(
      swapToToken.address,
      250000,
      250000,
      250000,
      deployer.address,
      1700000000,
      { value: 250000 }
    )

    const Converter = await ethers.getContractFactory('Converter')
    converter = await Converter.deploy(
      wETH,
      swapToToken.address,
      uniswapV2Router02Contract.address,
      triggerFee,
      [payeeA.address],
      shares
    )
    await converter.deployed()

    await testAToken.transfer(converter.address, 25000)
  })

  describe('Token Setup', async () => {
    it('test tokens minted and transferred to uniswap and converter contract', async () => {
      const tokenABalance = await testAToken.balanceOf(deployer.address)
      const tokenBBalance = await testBToken.balanceOf(deployer.address)
      const swapToTokenBalance = await swapToToken.balanceOf(deployer.address)
      const converterTokenABalance = await testAToken.balanceOf(
        converter.address
      )

      expect(tokenABalance).to.equal(225000)
      expect(tokenBBalance).to.equal(250000)
      expect(swapToTokenBalance).to.equal(250000)
      expect(converterTokenABalance).to.equal(25000)
    })
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
      expect(payeesAddress).to.equal(payeeA.address)
      expect(sharesAmount).to.equal(shares[0])
    })
  })

  describe('Add and remove payees and convert and transfer', async () => {
    it('multiple payees with even number of shares are added to converter contract', async () => {
      const payeeShares = 10
      const beginningTotalShares = await converter.totalShares()

      await converter.connect(deployer).addPayee(payeeB.address, payeeShares)
      await converter.connect(deployer).addPayee(payeeC.address, payeeShares)
      await converter.connect(deployer).addPayee(payeeD.address, payeeShares)

      const originalPayeeAAddress = await converter.payee(0)
      const newPayeeBAddress = await converter.payee(1)
      const newPayeeCAddress = await converter.payee(2)
      const newPayeeDAddress = await converter.payee(3)
      const originalPayeeAShares = await converter.shares(payeeA.address)
      const newPayeeBShares = await converter.shares(payeeB.address)
      const newPayeeCShares = await converter.shares(payeeC.address)
      const newPayeeDShares = await converter.shares(payeeD.address)
      const endingTotalShares = await converter.totalShares()

      expect(originalPayeeAAddress).to.equal(payeeA.address)
      expect(newPayeeBAddress).to.equal(payeeB.address)
      expect(newPayeeCAddress).to.equal(payeeC.address)
      expect(newPayeeDAddress).to.equal(payeeD.address)
      expect(originalPayeeAShares).to.equal(10)
      expect(newPayeeBShares).to.equal(10)
      expect(newPayeeCShares).to.equal(10)
      expect(newPayeeDShares).to.equal(10)
      expect(endingTotalShares).to.equal(
        parseFloat(beginningTotalShares) + parseFloat(payeeShares * 3)
      )
    })

    it('multiple payees with uneven number of shares are added to converter contract', async () => {
      const payeeAShares = 10
      const payeeBShares = 5
      const payeeCShares = 11
      const payeeDShares = 7
      const beginningTotalShares = await converter.totalShares()

      await converter.connect(deployer).addPayee(payeeB.address, payeeBShares)
      await converter.connect(deployer).addPayee(payeeC.address, payeeCShares)
      await converter.connect(deployer).addPayee(payeeD.address, payeeDShares)

      const originalPayeeAAddress = await converter.payee(0)
      const newPayeeBAddress = await converter.payee(1)
      const newPayeeCAddress = await converter.payee(2)
      const newPayeeDAddress = await converter.payee(3)
      const originalPayeeAShares = await converter.shares(payeeA.address)
      const newPayeeBShares = await converter.shares(payeeB.address)
      const newPayeeCShares = await converter.shares(payeeC.address)
      const newPayeeDShares = await converter.shares(payeeD.address)
      const endingTotalShares = await converter.totalShares()

      expect(originalPayeeAAddress).to.equal(payeeA.address)
      expect(newPayeeBAddress).to.equal(payeeB.address)
      expect(newPayeeCAddress).to.equal(payeeC.address)
      expect(newPayeeDAddress).to.equal(payeeD.address)
      expect(originalPayeeAShares).to.equal(payeeAShares)
      expect(newPayeeBShares).to.equal(payeeBShares)
      expect(newPayeeCShares).to.equal(payeeCShares)
      expect(newPayeeDShares).to.equal(payeeDShares)
      expect(endingTotalShares).to.equal(
        parseFloat(beginningTotalShares) +
          payeeBShares +
          payeeCShares +
          payeeDShares
      )
    })

    it('token is converted and distibuted evenly to multiple payees', async () => {
      const payeeShares = 10

      await converter.connect(deployer).addPayee(payeeB.address, payeeShares)
      await converter.connect(deployer).addPayee(payeeC.address, payeeShares)
      await converter.connect(deployer).addPayee(payeeD.address, payeeShares)

      await converter
        .connect(deployer)
        .convertAndTransfer(testAToken.address, MINAMOUNTOUT)

      const converterTokenABalance = await testAToken.balanceOf(
        converter.address
      )
      const msgSenderTokenABalance = await swapToToken.balanceOf(
        deployer.address
      )
      const payeeATokenBalance = await swapToToken.balanceOf(payeeA.address)
      const payeeBTokenBalance = await swapToToken.balanceOf(payeeB.address)
      const payeeCTokenBalance = await swapToToken.balanceOf(payeeC.address)
      const payeeDTokenBalance = await swapToToken.balanceOf(payeeD.address)

      expect(converterTokenABalance).to.equal(0)
      expect(msgSenderTokenABalance).to.equal(250207)
      expect(payeeATokenBalance).to.equal(5129)
      expect(payeeBTokenBalance).to.equal(5129)
      expect(payeeCTokenBalance).to.equal(5129)
      expect(payeeDTokenBalance).to.equal(5129)
    })

    it('token is converted and distibuted unevenly to multiple payees', async () => {
      const payeeBShares = 5
      const payeeCShares = 11
      const payeeDShares = 7

      await converter.connect(deployer).addPayee(payeeB.address, payeeBShares)
      await converter.connect(deployer).addPayee(payeeC.address, payeeCShares)
      await converter.connect(deployer).addPayee(payeeD.address, payeeDShares)

      await converter
        .connect(deployer)
        .convertAndTransfer(testAToken.address, MINAMOUNTOUT)

      const converterTokenABalance = await testAToken.balanceOf(
        converter.address
      )
      const msgSenderTokenABalance = await swapToToken.balanceOf(
        deployer.address
      )
      const payeeATokenBalance = await swapToToken.balanceOf(payeeA.address)
      const payeeBTokenBalance = await swapToToken.balanceOf(payeeB.address)
      const payeeCTokenBalance = await swapToToken.balanceOf(payeeC.address)
      const payeeDTokenBalance = await swapToToken.balanceOf(payeeD.address)

      expect(converterTokenABalance).to.equal(0)
      expect(msgSenderTokenABalance).to.equal(250207)
      expect(payeeATokenBalance).to.equal(6216)
      expect(payeeBTokenBalance).to.equal(3108)
      expect(payeeCTokenBalance).to.equal(6838)
      expect(payeeDTokenBalance).to.equal(4351)
    })

    it('payees are added and some removed and token is converted and distibuted evenly to remaining payees', async () => {
      const payeeShares = 10

      await converter.connect(deployer).addPayee(payeeB.address, payeeShares)
      await converter.connect(deployer).addPayee(payeeC.address, payeeShares)
      await converter.connect(deployer).addPayee(payeeD.address, payeeShares)
      await converter.connect(deployer).removePayee(payeeA.address, 0)

      await converter
        .connect(deployer)
        .convertAndTransfer(testAToken.address, MINAMOUNTOUT)

      const converterTokenABalance = await testAToken.balanceOf(
        converter.address
      )
      const msgSenderTokenABalance = await swapToToken.balanceOf(
        deployer.address
      )
      const payeeATokenBalance = await swapToToken.balanceOf(payeeA.address)
      const payeeBTokenBalance = await swapToToken.balanceOf(payeeB.address)
      const payeeCTokenBalance = await swapToToken.balanceOf(payeeC.address)
      const payeeDTokenBalance = await swapToToken.balanceOf(payeeD.address)

      expect(converterTokenABalance).to.equal(0)
      expect(msgSenderTokenABalance).to.equal(250207)
      expect(payeeATokenBalance).to.equal(0)
      expect(payeeBTokenBalance).to.equal(6838)
      expect(payeeCTokenBalance).to.equal(6838)
      expect(payeeDTokenBalance).to.equal(6838)
    })

    it('payees are added and some removed and token is converted and distibuted unevenly to remaining payees', async () => {
      const payeeBShares = 5
      const payeeCShares = 11
      const payeeDShares = 7

      await converter.connect(deployer).addPayee(payeeB.address, payeeBShares)
      await converter.connect(deployer).addPayee(payeeC.address, payeeCShares)
      await converter.connect(deployer).addPayee(payeeD.address, payeeDShares)
      await converter.connect(deployer).removePayee(payeeA.address, 0)

      await converter
        .connect(deployer)
        .convertAndTransfer(testAToken.address, MINAMOUNTOUT)

      const converterTokenABalance = await testAToken.balanceOf(
        converter.address
      )
      const msgSenderTokenABalance = await swapToToken.balanceOf(
        deployer.address
      )
      const payeeATokenBalance = await swapToToken.balanceOf(payeeA.address)
      const payeeBTokenBalance = await swapToToken.balanceOf(payeeB.address)
      const payeeCTokenBalance = await swapToToken.balanceOf(payeeC.address)
      const payeeDTokenBalance = await swapToToken.balanceOf(payeeD.address)

      expect(converterTokenABalance).to.equal(0)
      expect(msgSenderTokenABalance).to.equal(250207)
      expect(payeeATokenBalance).to.equal(0)
      expect(payeeBTokenBalance).to.equal(4460)
      expect(payeeCTokenBalance).to.equal(9812)
      expect(payeeDTokenBalance).to.equal(6244)
    })

    it('swapToToken is distibuted evenly to multiple payees', async () => {
      const payeeShares = 10

      await swapToToken.transfer(converter.address, 25000)

      await converter.connect(deployer).addPayee(payeeB.address, payeeShares)
      await converter.connect(deployer).addPayee(payeeC.address, payeeShares)
      await converter.connect(deployer).addPayee(payeeD.address, payeeShares)

      await converter
        .connect(deployer)
        .convertAndTransfer(swapToToken.address, MINAMOUNTOUT)

      const converterTokenABalance = await swapToToken.balanceOf(
        converter.address
      )
      const msgSenderTokenABalance = await swapToToken.balanceOf(
        deployer.address
      )
      const payeeATokenBalance = await swapToToken.balanceOf(payeeA.address)
      const payeeBTokenBalance = await swapToToken.balanceOf(payeeB.address)
      const payeeCTokenBalance = await swapToToken.balanceOf(payeeC.address)
      const payeeDTokenBalance = await swapToToken.balanceOf(payeeD.address)

      expect(converterTokenABalance).to.equal(2)
      expect(msgSenderTokenABalance).to.equal(225250)
      expect(payeeATokenBalance).to.equal(6187)
      expect(payeeBTokenBalance).to.equal(6187)
      expect(payeeCTokenBalance).to.equal(6187)
      expect(payeeDTokenBalance).to.equal(6187)
    })

    it('swapToToken and distibuted unevenly to multiple payees', async () => {
      const payeeBShares = 5
      const payeeCShares = 11
      const payeeDShares = 7

      await swapToToken.transfer(converter.address, 25000)

      await converter.connect(deployer).addPayee(payeeB.address, payeeBShares)
      await converter.connect(deployer).addPayee(payeeC.address, payeeCShares)
      await converter.connect(deployer).addPayee(payeeD.address, payeeDShares)

      await converter
        .connect(deployer)
        .convertAndTransfer(swapToToken.address, MINAMOUNTOUT)

      const converterTokenABalance = await swapToToken.balanceOf(
        converter.address
      )
      const msgSenderTokenABalance = await swapToToken.balanceOf(
        deployer.address
      )
      const payeeATokenBalance = await swapToToken.balanceOf(payeeA.address)
      const payeeBTokenBalance = await swapToToken.balanceOf(payeeB.address)
      const payeeCTokenBalance = await swapToToken.balanceOf(payeeC.address)
      const payeeDTokenBalance = await swapToToken.balanceOf(payeeD.address)

      expect(converterTokenABalance).to.equal(0)
      expect(msgSenderTokenABalance).to.equal(225250)
      expect(payeeATokenBalance).to.equal(7500)
      expect(payeeBTokenBalance).to.equal(3750)
      expect(payeeCTokenBalance).to.equal(8250)
      expect(payeeDTokenBalance).to.equal(5250)
    })

    it('trigger fee set to zero and user can still convert and transfer a token', async () => {
      await converter.connect(deployer).setTriggerFee(0)
      await converter
        .connect(deployer)
        .convertAndTransfer(testAToken.address, MINAMOUNTOUT)

      const converterTokenABalance = await testAToken.balanceOf(
        converter.address
      )
      const msgSenderTokenABalance = await swapToToken.balanceOf(
        deployer.address
      )
      const payeeTokenABalance = await swapToToken.balanceOf(payeeA.address)

      expect(converterTokenABalance).to.equal(0)
      expect(msgSenderTokenABalance).to.equal(250000)
      expect(payeeTokenABalance).to.equal(20723)
    })
  })
})
