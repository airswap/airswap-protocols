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
    * @notice Get a Sender-Side Quote from the Onchain Liquidity provider
    * @dev want to fetch the lowest _signerAmount for requested _senderAmount
    * @dev if no suitable Delegate found, defaults to 0x0 delegateLocator
    * @param _senderAmount uint256 The amount of ERC-20 token the delegate would send
    * @param _senderToken address The address of an ERC-20 token the delegate would send
    * @param _signerToken address The address of an ERC-20 token the signer would send
    * @param _maxIntents uint256 The maximum number of Peers to query
    * @return delegateAddress bytes32 The locator to connect to the peer
    * @return lowestCost uint256 The amount of ERC-20 tokens the signer would send
    */
  function getBestSenderSideQuote(
    uint256 _senderAmount,
    address _senderToken,
    address _signerToken,
    uint256 _maxIntents
  ) public view returns (bytes32 delegateAddress, uint256 lowestAmount) {


    // use the indexer to query delegates
    lowestAmount = MAX_INT;

    // Fetch an array of locators from the Indexer.
    bytes32[] memory locators = indexer.getIntents(
      _signerToken,
      _senderToken,
      _maxIntents
      );

    // Iterate through locators.
    for (uint256 i; i < locators.length; i++) {

      // Get a buy quote from the Delegate.
      uint256 signerAmount = IDelegate(address(bytes20(locators[i])))
        .getSignerSideQuote(_senderAmount, _senderToken, _signerToken);

      // Update the lowest cost.
      if (signerAmount > 0 && signerAmount < lowestAmount) {
        delegateAddress = locators[i];
        lowestAmount = signerAmount;
      }
    }

    // Return the Delegate address and amount.
    return (delegateAddress, lowestAmount);

  }

  /**
    * @notice Get a Signer-Side Quote from the Onchain Liquidity provider
    * @dev want to fetch the highest _senderAmount for requested _signerAmount
    * @dev if no suitable Delegate found, delegateLocator will be 0x0
    * @param _signerAmount uint256 The amount of ERC-20 token the signer would send
    * @param _signerToken address The address of an ERC-20 token the signer would send
    * @param _senderToken address The address of an ERC-20 token the peer would send
    * @param _maxIntents uint256 The maximum number of Delegates to query
    * @return delegateLocator bytes32  The locator to connect to the delegate
    * @return highAmount uint256 The amount of ERC-20 tokens the delegate would send
    */
  function getBestSignerSideQuote(
    uint256 _signerAmount,
    address _signerToken,
    address _senderToken,
    uint256 _maxIntents
  ) public view returns (bytes32 delegateLocator, uint256 highAmount) {

    highAmount = 0;

    // Fetch an array of locators from the Indexer.
    bytes32[] memory locators = indexer.getIntents(
      _signerToken,
      _senderToken,
      _maxIntents
      );

    // Iterate through locators.
    for (uint256 i; i < locators.length; i++) {

      // Get a buy quote from the Delegate.
      uint256 senderAmount = IDelegate(address(bytes20(locators[i])))
        .getSenderSideQuote(_signerAmount, _signerToken, _senderToken);

      // Update the highest amount.
      if (senderAmount > 0 && senderAmount > highAmount) {
        delegateLocator = locators[i];
        highAmount = senderAmount;
      }
    }

    // Return the Delegate address and amount.
    return (delegateLocator, highAmount);
  }

  /**
    * @notice Get and fill Sender-Side Quote from the Onchain Liquidity provider
    * @dev want to fetch the lowest _signerAmount for requested _senderAmount
    * @dev if no suitable Delegate found, will revert by checking peerLocator is 0x0
    * @param _senderAmount uint256 The amount of ERC-20 token the delegate would send
    * @param _senderToken address The address of an ERC-20 token the delegate would send
    * @param _signerToken address The address of an ERC-20 token the signer would send
    * @param _maxIntents uint256 The maximum number of Delegates to query
    */
  function fillBestSenderSideOrder(
    uint256 _senderAmount,
    address _senderToken,
    address _signerToken,
    uint256 _maxIntents
  ) external {

    // Find the best locator and amount on Indexed Delegates.
    (bytes32 delegateLocator, uint256 signerAmount) = getBestSenderSideQuote(
      _senderAmount,
      _senderToken,
      _signerToken,
      _maxIntents
    );

    // check if delegateLocator exists
    require(delegateLocator != bytes32(0), "NO_LOCATOR, BAILING");

    address delegateContract = address(bytes20(delegateLocator));

    // User transfers amount to the contract.
    IERC20(_signerToken).transferFrom(msg.sender, address(this), signerAmount);

    // DelegateFrontend approves Swap to move its new tokens.
    IERC20(_signerToken).approve(address(swapContract), signerAmount);

    // DelegateFrontend authorizes the Delegate.
    swapContract.authorizeSigner(delegateContract, block.timestamp + 1);

    // DelegateFrontend provides unsigned order to Delegate.
    IDelegate(delegateContract).provideOrder(Types.Order(
      uint256(keccak256(abi.encodePacked(
        block.timestamp,
        address(this),
        _signerToken,
        IDelegate(delegateContract).tradeWallet(),
        _senderToken))),
      block.timestamp + 1,
      Types.Party(
        0x277f8169,
        address(this),
        _signerToken,
        signerAmount
      ),
      Types.Party(
        0x277f8169,
        IDelegate(delegateContract).tradeWallet(),
        _senderToken,
        _senderAmount
      ),
      Types.Party(bytes4(0), address(0), address(0), 0),
      Types.Signature(address(0), 0, 0, 0, 0)
    ));

    // DelegateFrontend revokes the authorization of the Delegate.
    swapContract.revokeSigner(delegateContract);

    // DelegateFrontend transfers received amount to the User.
    IERC20(_senderToken).transfer(msg.sender, _senderAmount);
  }

  /**
    * @notice Get and fill Signer-Side Quote from the Onchain Liquidity provider
    * @dev want to fetch the highest _signerAmount for requested _senderAmount
    * @dev if no suitable Peer found, will revert by checking peerLocator is 0x0
    * @param _signerAmount uint256 The amount of ERC-20 token the signer would send
    * @param _signerToken address The address of an ERC-20 token the signer would send
    * @param _senderToken address The address of an ERC-20 token the peer would send
    * @param _maxIntents uint256 The maximum number of Peers to query
    */
  function fillBestSignerSideOrder(
    uint256 _signerAmount,
    address _signerToken,
    address _senderToken,
    uint256 _maxIntents
  ) external {

    // Find the best locator and amount on Indexed Delegate.
    (bytes32 delegateLocator, uint256 senderAmount) = getBestSignerSideQuote(
      _signerAmount,
      _signerToken,
      _senderToken,
      _maxIntents
    );

    // check if delegateLocator exists
    require(delegateLocator != bytes32(0), "NO_LOCATOR, BAILING");

    address delegateContract = address(bytes20(delegateLocator));

    // User transfers amount to the contract.
    IERC20(_signerToken).transferFrom(msg.sender, address(this), _signerAmount);

    // DelegateFrontend approves Swap to move its new tokens.
    IERC20(_signerToken).approve(address(swapContract), _signerAmount);

    // DelegateFrontend authorizes the Delegate.
    swapContract.authorizeSigner(delegateContract, block.timestamp + 1);

    // DelegateFrontend provides unsigned order to Delegate.
    IDelegate(delegateContract).provideOrder(Types.Order(
      uint256(keccak256(abi.encodePacked(
        block.timestamp,
        address(this),
        _signerToken,
        IDelegate(delegateContract).tradeWallet(),
        _senderToken
      ))),
      block.timestamp + 1,
      Types.Party(
        0x277f8169,
        address(this),
        _signerToken,
        _signerAmount
      ),
      Types.Party(
        0x277f8169,
        IDelegate(delegateContract).tradeWallet(),
        _senderToken,
        senderAmount
      ),
      Types.Party(bytes4(0), address(0), address(0), 0),
      Types.Signature(address(0), 0, 0, 0, 0)
    ));

    // DelegateFrontend revokes the authorization of the Delegate.
    swapContract.revokeSigner(delegateContract);

    // DelegateFrontend transfers received amount to the User.
    IERC20(_senderToken).transfer(msg.sender, senderAmount);
  }
}
