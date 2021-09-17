// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockCoin is ERC20 {
  constructor() ERC20("Mock Token", "MCK") {}

  function mint(address _receiver, uint256 _amount) public returns (bool) {
    _mint(_receiver, _amount);
    return true;
  }
}
