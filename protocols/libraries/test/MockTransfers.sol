pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "../contracts/Transfers.sol";

/**
  * @notice Contract is a wrapper for Transfers library
  * for use with testing only
  *
  */
contract MockTransfers {

  function send(
    address _receiver,
    uint256 _value
  ) public payable {
    Transfers.send(_receiver, _value);
  }

  function transferFungible(
    address _from,
    address _to,
    uint256 _param,
    address _token
  ) public {
    Transfers.transferFungible(_from, _to, _param, _token);
  }

  function transferAny(
    address _from,
    address _to,
    uint256 _param,
    address _token,
    bytes4 _kind
  ) public {
    Transfers.transferAny(_from, _to, _param, _token, _kind);
  }
}
