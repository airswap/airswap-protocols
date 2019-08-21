pragma solidity ^0.5.4;

contract Token {
    mapping(address => uint) public balances;
    function airdrop() public{
         balances[msg.sender] = 1000;
    }
    function consume() public{
         require(balances[msg.sender]>0);
         balances[msg.sender] -= 1;
    }
    function backdoor() public{
         balances[msg.sender] += 1;
    }
    function echidna_balance_under_1000() public view returns(bool){
         return balances[msg.sender] <= 1000;
    }
}   

