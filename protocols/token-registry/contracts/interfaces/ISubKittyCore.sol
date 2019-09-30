pragram solidity 0.5.10;

/**
 * @title ISubKittyCore
 * @dev transferFrom function from KittyCore
 * @dev see https://github.com/ethereum/EIPs/issues/20
 */
contract ISubKittyCore {
    function transferFrom(address _from, address _to, uint256 _tokenId) external;
}