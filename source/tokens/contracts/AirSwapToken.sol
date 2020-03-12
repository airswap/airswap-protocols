pragma solidity 0.5.12;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";

contract AirSwapToken is ERC20Detailed, ERC20Mintable {
    constructor (string memory name, string memory symbol, uint8 decimals) 
    ERC20Detailed(name, symbol, decimals)
    public {
        mint(msg.sender, 5000000000000);
    }
}
