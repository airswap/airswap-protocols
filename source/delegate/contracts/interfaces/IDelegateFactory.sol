// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

interface IDelegateFactory {
  event CreateDelegate(
    address indexed delegateContract,
    address swapContract,
    address indexerContract,
    address indexed delegateContractOwner,
    address delegateTradeWallet
  );

  /**
   * @notice Deploy a trusted delegate contract
   * @param delegateTradeWallet the wallet the delegate will trade from
   * @return delegateContractAddress address of the delegate contract created
   */
  function createDelegate(
    address delegateTradeWallet
  ) external returns (address delegateContractAddress);
}
