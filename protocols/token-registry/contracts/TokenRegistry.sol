pragma solidity 0.5.10;

import "./interfaces/IAsset.sol";

contract TokenRegistry {

	address owner;
	event AddToRegistry(bytes4 kind, address contractAddress);
    event RemoveFromRegistry(bytes4 kind, address contractAddress);

	// Mapping of bytes4 to contract interface type
    mapping (bytes4 => IAsset) public assetMapping;

	constructor() public {
		owner = msg.sender;
	}


	function addToRegistry(bytes4 _kind, IAsset _asset) public{
        require(msg.sender == owner);
        assetMapping[_kind] = _asset;
        emit AddToRegistry(_kind, address(_asset));
	}

    function deleteFromRegistry(bytes4 _kind) public{
        require(msg.sender == owner);
        emit RemoveFromRegistry(_kind, address(assetMapping[_kind]));
        del assetMapping[_kind];
    }
}