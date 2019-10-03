/*
  Copyright 2019 Swap Holdings Ltd.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "@airswap/indexer/contracts/interfaces/IIndexer.sol";
import "@airswap/delegate/contracts/interfaces/IDelegate.sol";
import "@airswap/swap/contracts/interfaces/ISwap.sol";

/**
  * @title DelegateFrontend: Onchain Liquidity provider for the Swap Protocol
  */
contract DelegateFrontend {

  uint256 constant public MAX_INT =  2**256 - 1;

  IIndexer public indexer;
  ISwap public swapContract;

  constructor(address _indexer, address _swap) public {
    indexer = IIndexer(_indexer);
    swapContract = ISwap(_swap);
  }

  /**
    * @notice Get a Taker-Side Quote from the Onchain Liquidity provider
    * @dev want to fetch the lowest _makerAmount for requested _takerAmount
    * @dev if no suitable Delegate found, defaults to 0x0 delegateLocator
    * @param _takerAmount uint256 The amount of ERC-20 token the delegate would send
    * @param _takerToken address The address of an ERC-20 token the delegate would send
    * @param _makerToken address The address of an ERC-20 token the consumer would send
    * @param _maxIntents uint256 The maximum number of Delegates to query
    * @return delegateAddress bytes32
    * @return lowestCost uint256
    */
  function getBestTakerSideQuote(
    uint256 _takerAmount,
    address _takerToken,
    address _makerToken,
    uint256 _maxIntents
  ) public view returns (bytes32 delegateAddress, uint256 lowestAmount) {


    // use the indexer to query delegates
    lowestAmount = MAX_INT;

    // Fetch an array of locators from the Indexer.
    bytes32[] memory locators = indexer.getIntents(
      _makerToken,
      _takerToken,
      _maxIntents
      );

    // Iterate through locators.
    for (uint256 i; i < locators.length; i++) {

      // Get a buy quote from the Delegate.
      uint256 makerAmount = IDelegate(address(bytes20(locators[i])))
        .getMakerSideQuote(_takerAmount, _takerToken, _makerToken);

      // Update the lowest cost.
      if (makerAmount > 0 && makerAmount < lowestAmount) {
        delegateAddress = locators[i];
        lowestAmount = makerAmount;
      }
    }

    // Return the Delegate address and amount.
    return (delegateAddress, lowestAmount);

  }

  /**
    * @notice Get a Maker-Side Quote from the Onchain Liquidity provider
    * @dev want to fetch the highest _takerAmount for requested _makerAmount
    * @dev if no suitable Delegate found, delegateLocator will be 0x0
    * @param _makerAmount uint256 The amount of ERC-20 token the delegate would send
    * @param _makerToken address The address of an ERC-20 token the delegate would send
    * @param _takerToken address The address of an ERC-20 token the consumer would send
    * @param _maxIntents uint256 The maximum number of Delegates to query
    * @return delegateLocator bytes32  The amount of ERC-20 token the consumer would send
    * @return lowestCost uint256 The amount of ERC-20 token the consumer would send
    */
  function getBestMakerSideQuote(
    uint256 _makerAmount,
    address _makerToken,
    address _takerToken,
    uint256 _maxIntents
  ) public view returns (bytes32 delegateLocator, uint256 highAmount) {

    // use the indexer to query delegates
    highAmount = 0;

    // Fetch an array of locators from the Indexer.
    bytes32[] memory locators = indexer.getIntents(
      _makerToken,
      _takerToken,
      _maxIntents
      );

    // Iterate through locators.
    for (uint256 i; i < locators.length; i++) {

      // Get a buy quote from the Delegate.
      uint256 takerAmount = IDelegate(address(bytes20(locators[i])))
        .getTakerSideQuote(_makerAmount, _makerToken, _takerToken);

      // Update the highest amount.
      if (takerAmount > 0 && takerAmount > highAmount) {
        delegateLocator = locators[i];
        highAmount = takerAmount;
      }
    }

    // Return the Delegate address and amount.
    return (delegateLocator, highAmount);
  }

  /**
    * @notice Get and fill Taker-Side Quote from the Onchain Liquidity provider
    * @dev want to fetch the lowest _makerAmount for requested _takerAmount
    * @dev if no suitable Delegate found, will revert by checking delegateLocator is 0x0
    * @param _takerAmount uint256 The amount of ERC-20 token the delegate would send
    * @param _takerToken address The address of an ERC-20 token the delegate would send
    * @param _makerToken address The address of an ERC-20 token the consumer would send
    * @param _maxIntents uint256 The maximum number of Delegates to query
    * @return delegateAddress bytes32
    * @return lowestCost uint256
    */
  function fillBestTakerSideOrder(
    uint256 _takerAmount,
    address _takerToken,
    address _makerToken,
    uint256 _maxIntents
  ) external {

    // Find the best buy among Indexed Delegates.
    (bytes32 delegateLocator, uint256 makerAmount) = getBestTakerSideQuote(
      _takerAmount,
      _takerToken,
      _makerToken,
      _maxIntents
    );

    // check if delegateLocator exists
    require(delegateLocator != bytes32(0), "NO_LOCATOR, BAILING");

    address delegateContract = address(bytes20(delegateLocator));

    // User transfers amount to the contract.
    IERC20(_makerToken).transferFrom(msg.sender, address(this), makerAmount);

    // DelegateFrontend approves Swap to move its new tokens.
    IERC20(_makerToken).approve(address(swapContract), makerAmount);

    // DelegateFrontend authorizes the Delegate.
    swapContract.authorize(delegateContract, block.timestamp + 1);

    // Consumer provides unsigned order to Delegate.
    IDelegate(delegateContract).provideOrder(Types.Order(
      uint256(keccak256(abi.encodePacked(
        block.timestamp,
        address(this),
        _makerToken,
        IDelegate(delegateContract).tradeWallet(),
        _takerToken))),
      block.timestamp + 1,
      Types.Party(
        address(this), // consumer is acting as the maker in this case
        _makerToken,
        makerAmount,
        0x277f8169
      ),
      Types.Party(
        IDelegate(delegateContract).tradeWallet(),
        _takerToken,
        _takerAmount,
        0x277f8169
      ),
      Types.Party(address(0), address(0), 0, bytes4(0)),
      Types.Signature(address(0), 0, 0, 0, 0)
    ));

    // DelegateFrontend revokes the authorization of the Delegate.
    swapContract.revoke(delegateContract);

    // DelegateFrontend transfers received amount to the User.
    IERC20(_takerToken).transfer(msg.sender, _takerAmount);
  }

  function fillBestMakerSideOrder(
    uint256 _makerAmount,
    address _makerToken,
    address _takerToken,
    uint256 _maxIntents
  ) external {

    // Find the best buy among Indexed Delegates.
    (bytes32 delegateLocator, uint256 takerAmount) = getBestMakerSideQuote(
      _makerAmount,
      _makerToken,
      _takerToken,
      _maxIntents
    );

    // check if delegateLocator exists
    require(delegateLocator != bytes32(0), "NO_LOCATOR, BAILING");

    address delegateContract = address(bytes20(delegateLocator));

    // User transfers amount to the contract.
    IERC20(_makerToken).transferFrom(msg.sender, address(this), _makerAmount);

    // DelegateFrontend approves Swap to move its new tokens.
    IERC20(_makerToken).approve(address(swapContract), _makerAmount);

    // DelegateFrontend authorizes the Delegate.
    swapContract.authorize(delegateContract, block.timestamp + 1);

    // Consumer provides unsigned order to Delegate.
    IDelegate(delegateContract).provideOrder(Types.Order(
      uint256(keccak256(abi.encodePacked(
        block.timestamp,
        address(this),
        _makerToken,
        IDelegate(delegateContract).tradeWallet(),
        _takerToken
      ))),
      block.timestamp + 1,
      Types.Party(
        address(this), // consumer is acting as the maker in this case
        _makerToken,
        _makerAmount,
        0x277f8169
      ),
      Types.Party(
        IDelegate(delegateContract).tradeWallet(),
        _takerToken,
        takerAmount,
        0x277f8169
      ),
      Types.Party(address(0), address(0), 0, bytes4(0)),
      Types.Signature(address(0), 0, 0, 0, 0)
    ));

    // DelegateFrontend revokes the authorization of the Delegate.
    swapContract.revoke(delegateContract);

    // DelegateFrontend transfers received amount to the User.
    IERC20(_takerToken).transfer(msg.sender, takerAmount);
  }
}
