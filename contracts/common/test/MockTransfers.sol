pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../libraries/Transfers.sol";

/**
  * @notice Contract is a wrapper for Transfers library
  * for use with testing only
  *
  */
contract MockTransfers {

  function send(address _receiver,
  uint256 _value) public payable {
    Transfers.send(_receiver, _value);
  }

  function transferAny( address _token,
    address _from,
    address _to,
    uint256 _param) public {
    Transfers.transferAny(_token, _from, _to, _param);
  }

  function safeTransferAny( bytes memory _side,
    address _from,
    address _to,
    uint256 _param,
    address _token) public {
    Transfers.safeTransferAny(_side,
    _from,
    _to,
    _param,
    _token);
  }
}