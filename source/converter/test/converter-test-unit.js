const { expect } = require("chai");
const timeMachine = require("ganache-time-traveler");
const { ethers } = require("hardhat");

describe("Converter Unit", () => {
  let snapshotId;
  let deployer;
  let account1;
  let account2;
  let testAToken;
  let testBToken;
  let swapToToken;
  let uniswapV2Router02Contract;
  let converter;
  let uniRouter
  let triggerFee = 1;
  let payees = ['0x7296333e1615721f4Bd9Df1a3070537484A50CF8'];
  let shares = [10];

  beforeEach(async () => {
    const snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot["result"];
  });

  afterEach(async () => {
    await timeMachine.revertToSnapshot(snapshotId);
  });

  before(async () => {
    ;[deployer, account1, account2] = await ethers.getSigners();

    const TestAToken = await ethers.getContractFactory('ERC20PresetMinterPauser');

    testAToken = await TestAToken.deploy("TestAToken", "TESTA");

    await testAToken.deployed();

    await testAToken.mint(deployer.address, 1000000);

    const TestBToken = await ethers.getContractFactory("ERC20PresetMinterPauser");
    testBToken = await TestBToken.deploy("TestBToken", "TESTB");
    await testBToken.deployed();

    await testBToken.mint(deployer.address, 1000000);

    const SwapToToken = await ethers.getContractFactory("ERC20PresetMinterPauser");
    swapToToken = await SwapToToken.deploy("SwapToToken", "SWAPTO");
    await swapToToken.deployed();

    await swapToToken.mint(deployer.address, 1000000);

    const UniswapV2Router02Contract = await ethers.getContractFactory("UniswapV2Router02");
    uniswapV2Router02Contract = await UniswapV2Router02Contract.deploy("0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
    await uniswapV2Router02Contract.deployed();

    testATokenApprove = await testAToken.approve(uniswapV2Router02Contract.address, 1000000);
    testBTokenApprove = await testBToken.approve(uniswapV2Router02Contract.address, 1000000);
    swapToTokenApprove = await swapToToken.approve(uniswapV2Router02Contract.address, 1000000);

    await uniswapV2Router02Contract.addLiquidity(
      testAToken.address,
      testBToken.address,
      250000,
      250000,
      250000,
      250000,
      deployer.address,
      1628647649
    );

    await uniswapV2Router02Contract.addLiquidity(
      testAToken.address,
      swapToToken.address,
      250000,
      250000,
      250000,
      250000,
      deployer.address,
      1628647649
    );

    await uniswapV2Router02Contract.addLiquidity(
      testBToken.address,
      swapToToken.address,
      250000,
      250000,
      250000,
      250000,
      deployer.address,
      1628647649
    );

    await uniswapV2Router02Contract.addLiquidityETH(
      testAToken.address,
      250000,
      250000,
      250000,
      deployer.address,
      1628647649,
      { value: 250000 }
    );

    await uniswapV2Router02Contract.addLiquidityETH(
      testBToken.address,
      250000,
      250000,
      250000,
      deployer.address,
      1628647649,
      { value: 250000 }
    );

    await uniswapV2Router02Contract.addLiquidityETH(
      swapToToken.address,
      250000,
      250000,
      250000,
      deployer.address,
      1628647649,
      { value: 250000 }
    );

    uniRouter = uniswapV2Router02Contract.address;

    Converter = await ethers.getContractFactory("Converter");
    converter = await Converter.deploy(
      swapToToken.address,
      uniRouter,
      triggerFee,
      payees,
      shares
    );
    await converter.deployed();

    await testAToken.transfer(converter.address, 25000)

  });

  describe("Token Setup", async () => {
    it("test tokens minted and transferred to uniswap and converter contract", async () => {
      const tokenABalance = await testAToken.balanceOf(deployer.address);
      const tokenBBalance = await testBToken.balanceOf(deployer.address);
      const swapToTokenBalance = await swapToToken.balanceOf(deployer.address);
      const converterTokenABalance = await testAToken.balanceOf(converter.address);

      expect(tokenABalance).to.equal(225000);
      expect(tokenBBalance).to.equal(250000);
      expect(swapToTokenBalance).to.equal(250000);
      expect(converterTokenABalance).to.equal(25000);
    });

  });

  describe("Default Values", async () => {
    it("constructor sets default values", async () => {
      const owner = await converter.owner();
      const swapToTokenAddress = await converter.swapToToken();
      const uniRouterAddress = await converter.uniRouter();
      const triggerFeeAmount = await converter.triggerFee();
      const payeesAddress = await converter.payee(0);
      const sharesAmount = await converter.shares(payeesAddress);

      expect(owner).to.equal(deployer.address);
      expect(swapToTokenAddress).to.equal(swapToToken.address);
      expect(uniRouterAddress).to.equal(uniRouter);
      expect(triggerFeeAmount).to.equal(triggerFee);
      expect(payeesAddress).to.equal(payees[0]);
      expect(sharesAmount).to.equal(shares[0]);
    });
  });

  describe("Set swapToToken", async () => {
    it("non owner cannot set swapToToken", async () => {
      await expect(
        converter
          .connect(account1)
          .setSwapToToken("0x6B175474E89094C44Da98b954EedeAC495271d0F")
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("owner cannot set swapToToken to zero address", async () => {
      await expect(
        converter.connect(deployer).setSwapToToken("0x0000000000000000000000000000000000000000")
      ).to.be.revertedWith("Cannot set to zero address");
    });

    it("owner can set swapToToken", async () => {
      await converter
        .connect(deployer)
        .setSwapToToken("0x6B175474E89094C44Da98b954EedeAC495271d0F");

      const swapToTokenAddress = await converter.swapToToken();
      expect(swapToTokenAddress).to.equal(
        "0x6B175474E89094C44Da98b954EedeAC495271d0F"
      );
    });
  });

  describe("Set triggerFee", async () => {
    it("non owner cannot set triggerFee", async () => {
      await expect(
        converter.connect(account1).setTriggerFee(2)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("owner cannot set triggerFee greater than 100", async () => {
      await expect(
        converter.connect(deployer).setTriggerFee(101)
      ).to.be.revertedWith("Cannot set trigger fee above 100");
    });

    it("owner can set triggerFee", async () => {
      await converter.connect(deployer).setTriggerFee(2);

      const triggerFeeNum = await converter.triggerFee();
      expect(triggerFeeNum).to.equal(2);
    });
  });

  describe("Set tokenPath", async () => {
    it("non owner cannot set tokenPath", async () => {
      const path = [testAToken.address, testBToken.address, swapToToken.address];
      await expect(
        converter.connect(account1).setTokenPath("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", path)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("owner can set tokenPath", async () => {
      const aAddress = testAToken.address;
      const bAddress = testBToken.address;
      const cAddress = swapToToken.address;
      const path = [aAddress, bAddress, cAddress];
      await converter.connect(deployer).setTokenPath(aAddress, path);

      const _tokenPath = await converter.getTokenPath(aAddress);
      expect(_tokenPath[0]).to.equal(testAToken.address);
      expect(_tokenPath[1]).to.equal(testBToken.address);
      expect(_tokenPath[2]).to.equal(swapToToken.address);
    });

    it('token is added to current tokens list', async () => {
      const aAddress = testAToken.address
      const bAddress = testBToken.address
      const cAddress = swapToToken.address
      const path = [aAddress, bAddress, cAddress]
      await converter.connect(deployer).setTokenPath(aAddress, path)
      const addedToken = await converter.currTokens(0)
      expect(addedToken).to.equal(aAddress)
    });
  });

  describe("Add Payee", async () => {
    const payeeAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
    const payeeShares = 5;
    it("non owner cannot add payee", async () => {
      await expect(
        converter.connect(account1).addPayee(payeeAddress, payeeShares)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("owner cannot add payee if they are already included in payee array", async () => {
      const existingPayee = await converter.connect(deployer).payee(0);
      await expect(
        converter.connect(deployer).addPayee(existingPayee, payeeShares)
      ).to.be.revertedWith("PaymentSplitter: account already has shares");
    });

    it("owner cannot add payee with zero shares", async () => {
      await expect(
        converter.connect(deployer).addPayee(payeeAddress, 0)
      ).to.be.revertedWith("PaymentSplitter: shares are 0");
    });

    it("owner can add payee", async () => {
      const beginningTotalShares = await converter.connect(deployer).totalShares();

      await converter.connect(deployer).addPayee(payeeAddress, payeeShares);

      const newPayeeAddress = await converter.payee(1);
      const newPayeeShares = await converter.shares(newPayeeAddress);
      const endingTotalShares = await converter.totalShares();
      expect(newPayeeAddress).to.equal(
        "0x6B175474E89094C44Da98b954EedeAC495271d0F"
      );
      expect(newPayeeShares).to.equal(5);
      expect(endingTotalShares).to.equal(
        parseFloat(beginningTotalShares) + parseFloat(payeeShares)
      );
    });

  });

  describe("Remove Payee", async () => {

    const correctPayeeIndex = 0;
    const incorrectPayeeIndex = 1;
    it("non owner cannot remove payee", async () => {
      const correctPayeeAddress = await converter.payee(0);
      await expect(
        converter.connect(account1).removePayee(correctPayeeAddress, correctPayeeIndex)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("owner cannot remove payee if they are not on payee array", async () => {
      const incorrectPayeeAddress = account2.address;
      await expect(
        converter.connect(deployer).removePayee(incorrectPayeeAddress, correctPayeeIndex)
      ).to.be.revertedWith("PaymentSplitter: account does not match payee array index");
    });

    it("owner cannot remove payee if provided wrong payee index for payee array", async () => {
      const correctPayeeAddress = await converter.payee(0);
      await expect(
        converter.connect(deployer).removePayee(correctPayeeAddress, incorrectPayeeIndex)
      ).to.be.revertedWith("PaymentSplitter: index not in payee array");
    });

    it("owner can remove payee", async () => {
      const correctPayeeAddress = await converter.payee(0);
      await converter.connect(deployer).removePayee(correctPayeeAddress, correctPayeeIndex);

      const removedPayeeShares = await converter.shares(correctPayeeAddress);
      const endingTotalShares = await converter.totalShares();
      await expect(converter.payee(0)).to.be.revertedWith("PaymentSplitter: There are no payees");
      expect(removedPayeeShares).to.equal(0);
      expect(endingTotalShares).to.equal(0);
    });
  });

  describe('Convert and transfer', async () => {
    it('user can convert and transfer any token along a preset Uniswap pool path of 2', async () => {

      const aAddress = testAToken.address;
      const cAddress = swapToToken.address;
      const path = [aAddress, cAddress];
      await converter.connect(deployer).setTokenPath(aAddress, path);

      await converter.connect(deployer).convertAndTransfer(testAToken.address, 0);

      const converterTokenABalance = await testAToken.balanceOf(converter.address);
      const msgSenderTokenABalance = await swapToToken.balanceOf(deployer.address);
      const payeeTokenABalance = await swapToToken.balanceOf(payees[0]);

      expect(converterTokenABalance).to.equal(0);
      expect(msgSenderTokenABalance).to.equal(250226);
      expect(payeeTokenABalance).to.equal(22439);

    })

    it('user can convert and transfer any token along a default Uniswap pool path of 3', async () => {
      await converter.connect(deployer).convertAndTransfer(testAToken.address, 0);

      const converterTokenABalance = await testAToken.balanceOf(converter.address);
      const msgSenderTokenABalance = await swapToToken.balanceOf(deployer.address);
      const payeeTokenABalance = await swapToToken.balanceOf(payees[0]);

      expect(converterTokenABalance).to.equal(0);
      expect(msgSenderTokenABalance).to.equal(250207);
      expect(payeeTokenABalance).to.equal(20516);

    });

    it('user can transfer swapToToken', async () => {
      await swapToToken.transfer(converter.address, 25000)
      await converter.connect(deployer).convertAndTransfer(swapToToken.address, 0);

      const converterTokenABalance = await swapToToken.balanceOf(converter.address);
      const msgSenderTokenABalance = await swapToToken.balanceOf(deployer.address);
      const payeeTokenABalance = await swapToToken.balanceOf(payees[0]);

      expect(converterTokenABalance).to.equal(0);
      expect(msgSenderTokenABalance).to.equal(225250);
      expect(payeeTokenABalance).to.equal(24750);

    });

    it('event ConvertAndTransfer is emitted when user successfully calls convertAndTransfer function along a Uniswap pool path of 2', async () => {

      const aAddress = testAToken.address;
      const cAddress = swapToToken.address;
      const path = [aAddress, cAddress];
      await converter.connect(deployer).setTokenPath(aAddress, path);

      await expect(converter.connect(deployer).convertAndTransfer(testAToken.address, 0))
        .to.emit(converter, 'ConvertAndTransfer')
        .withArgs(deployer.address, testAToken.address, swapToToken.address, 25000, 22439, payees);

    })

    it('event ConvertAndTransfer is emitted when user successfully calls convertAndTransfer function along a Uniswap pool path of 3', async () => {

      await expect(converter.connect(deployer).convertAndTransfer(testAToken.address, 0))
        .to.emit(converter, 'ConvertAndTransfer')
        .withArgs(deployer.address, testAToken.address, swapToToken.address, 25000, 20516, payees);

    })

    it('event ConvertAndTransfer is emitted when user successfully calls convertAndTransfer function on swapToToken', async () => {

      await swapToToken.transfer(converter.address, 25000)
      await expect(converter.connect(deployer).convertAndTransfer(swapToToken.address, 0))
        .to.emit(converter, 'ConvertAndTransfer')
        .withArgs(deployer.address, swapToToken.address, swapToToken.address, 25000, 24750, payees);

    })

  });

  describe('Drain all', () => {
    it('drains all the tokens held in the contract to a specified address', async () => {
      const aAddress = testAToken.address
      const bAddress = testBToken.address
      const cAddress = swapToToken.address
      const path = [aAddress, bAddress, cAddress]
      await converter.connect(deployer).setTokenPath(aAddress, path)
      await converter.drainto(account1.address)
      expect(await testAToken.balanceOf(converter.address)).to.equal(0)
      expect(await testAToken.balanceOf(account1.address)).to.equal(25000)
    });

    it('event DrainTo is emitted when user successfully calls drainTo', async () => {
      const aAddress = testAToken.address
      const bAddress = testBToken.address
      const cAddress = swapToToken.address
      const path = [aAddress, bAddress, cAddress]
      await converter.connect(deployer).setTokenPath(aAddress, path)
      await expect(converter.connect(deployer).drainto(account1.address))
        .to.emit(converter, 'DrainTo')
        .withArgs(account1.address, [aAddress, bAddress, cAddress]);
    });
  });
});
