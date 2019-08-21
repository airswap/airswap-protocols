pragma solidity ^0.5.10;

import "./Wrapper.sol";
import "./ISwap.sol";
import "./IWETH.sol";

contract EchidnaWrapper is Wrapper {
    constructor() public Wrapper(address(1), address(2)) {
    }

    function echidna_swapContract_address() public view returns(bool) {
        return address(swapContract) == address(1);
    }

    function echidna_wethContract_address() public view returns(bool) {
        return address(wethContract) == address(2);
    }

    function echidna_balance() public view returns(bool) {
        return address(this).balance == 0;
    }
}
