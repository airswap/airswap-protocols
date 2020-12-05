/*
  Copyright 2020 Swap Holdings Ltd.

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

pragma solidity 0.5.16;

import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

/**
 * @title Pool: Claim Tokens Based on a Pricing Function
 */
contract Pool is Ownable, Pausable {
  using SafeMath for uint256;

  // Maximum integer for token transfer approval
  bytes1 internal constant NOTTRUSTED = 0x00;
  bytes1 internal constant TRUSTED = 0x01;

  // Higher the scale, lower the output for a claim
  uint256 public _scale;

  // Percentage available for a claim with infinite credits
  uint256 public _max;

  mapping(address => bytes2) public signers;

  /**
   * @notice Events
   */
  event Claim(address account, address token, uint256 amount);
  event AddSigner(address signer);
  event RemoveSigner(address signer);

  /**
   * @notice Constructor
   * @param scale_ uint256
   * @param max_ uint256
   */
  constructor(uint256 scale_, uint256 max_) public {
    _scale = scale_;
    _max = max_;
  }

  function addSigner(address signer) public onlyOwner {
    signers[signer] = TRUSTED;
    emit AddSigner(signer);
  }

  function removeSigner(address signer) public onlyOwner {
    signers[signer] = NOTTRUSTED;
    emit RemoveSigner(signer);
  }

  /**
   * @notice Claims a portion of available tokens and transfers to the participant (msg.sender)
   * @param credits uint256
   * @param token address
   */
  function claim(uint256 credits, address token) public {
    // TODO: Replace "credits" with "signature" and implement checks to determine value

    uint256 amount = getOutput(credits, token);
    IERC20(token).transfer(msg.sender, amount);
    emit Claim(msg.sender, token, amount);
  }

  /**
   * @notice Get output amount for an input
   * @param input uint256
   * @param token address
   */
  function getOutput(uint256 input, address token)
    public
    view
    returns (uint256 amount)
  {
    return
      (_max *
        ((input * IERC20(token).balanceOf(address(this))) /
          ((10**_scale) + input))) / 100;
  }
}
