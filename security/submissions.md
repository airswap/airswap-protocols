# Bounty Submissions

## Submission by J.C.

### Title

ERC20 tokens with older implementation would not be supported in AirSwap

Likelihood: High, Impact: High, Severity: Critical

### Summary

There are around 130+ ERC20 tokens present which wrongly implemented the ERC20 standard. These ERC20 tokens does not return a boolean value for ERC20 functions "transfer()", "transferFrom()", "approve()". However, in correct ERC20 implementation these functions must return a boolean value. The contracts which are making calls to these function must support both ERC20 API implementation. However, "Delegate" and "Indexer" contracts only supports ERC20 tokens having correct implementation. These contracts does not support wrongly implemented ERC20 standard, hence these 130+ tokens would not be supported by AirSwap.

### Detailed Description

The 130+ ERC20 tokens which wrongly implemented the ERC20 standard are listed in the below blog post.

https://medium.com/coinmonks/missing-return-value-bug-at-least-130-tokens-affected-d67bf08521ca

In "Delegate" contract at following places IERC20 is used:

In contract's constructor:

```
require(
  IERC20(indexer.stakingToken())
  .approve(address(indexer), MAX_INT), "STAKING_APPROVAL_FAILED"
);
```

In "setRuleAndIntent" function:

```
require(
  IERC20(indexer.stakingToken())
  .transferFrom(msg.sender, address(this), newStakeAmount - oldStakeAmount), "STAKING_TRANSFER_FAILED"
);
```

In "unsetRuleAndIntent" function:

```
require(
  IERC20(indexer.stakingToken())
    .transfer(msg.sender, stakedAmount),"STAKING_RETURN_FAILED"
);
```

In "Indexer" contract at following places IERC20 is used:

In "setIntent" function:

```
require(stakingToken.transferFrom(msg.sender, address(this), stakingAmount),
  "UNABLE_TO_STAKE");
```

In "\_updateIntent" function:

```
require(stakingToken.transferFrom(user, address(this), newAmount - oldAmount),
  "UNABLE_TO_STAKE");
require(stakingToken.transfer(user, oldAmount - newAmount));
```

In "\_unsetIntent" function:

```
require(stakingToken.transfer(user, score));
```

As you can see that all the above calls are enclosed in "require()" function. This would ensure that the function calls must return a boolean value. However, a function call to a token which wrongly implemented ERC20 tokens would always fail. Hence, AirSwap contracts would not be able to support wrongly implemented ERC20 tokens.

### Attack Scenario

A "Delegate" contract deployed to support wrongly implemented ERC20 standard would not be supported and calls would always fail.

### Proposed Impact

These 130+ ERC20 tokens would not be supported by AirSwap contracts. This list includes some well known tokens like OMG (OmiseGo) and BNB (Binance).
Additional Notes

To fix this problem, use "SafeERC20" contract defined in OpenZeppelin library. You are using OpenZeppelin 2.3.0 version which has a support for these function calls. Hence, use the "safeTransfer", "safeTransferFrom" or "safeApprove" at appropriate places in your contracts.

https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v2.3.0/contracts/token/ERC20/SafeERC20.sol

### Response from Team

Thanks for reaching out! We've reviewed the issue that you've described. Unfortunately, it does not qualify for a reward as this behavior is working as intended and thus there is no critical impact.

The design of the protocol is that the token used for staking within the Indexer does have to be a standard ERC20 token. We have an open documentation item about this behavior: https://github.com/airswap/airswap-protocols/issues/227

The staking token that is used in the Delegate and Indexer would not support non-standard ERC20. The only scenario, though unlikely, where this scenario could manifest is if a party were to create an Indexer with a non-standard ERC20 token in the constructor. In addition, then others would have to create a Delegate referencing this Indexer contract. Thus, there would be a non-functional Indexer and Delegate though users are not at risk of losing locked ether or other tokens, outside of gas fees.

The actual token transfer functions within the Swap.sol contract does take into account non-standard ERC20 contracts. Thus, the Swap protocol will support tokens such as USDT and BNB. While the contract does not use SafeERC20.sol from OpenZeppelin, we created a custom interface as a workaround. It also takes into account non-standard ERC721 contracts as not all ERC721 implement safeTransferFrom.

Thanks,
Deepa Sathaye
deepa.sathaye@fluidity.io

## Submission by J.C.

### Summary

I was checking "Index" contract and found that the doubly LinkedList could have many issues as its allowed "locator" variable to be passed as "0" in "setLocator" function.

One issue that I could see that if owner calls "setLocator" function multiple times passing the same following values when LinkedList is empty:
identifier = 0x1 (it could be any non existing address)
score = 0
locator = 0
Calling "setLocator" function with above parameters twice on an empty LinkedList would break the LinkedList's linking and LinkedList would be separated into two.

### Detailed Description

I looked into this issue deeply and tested in Remix to perform different kinds of scenarios.

I found that using the following steps an attacker can distort the LinkedList maintained in "Index" of a pair of tokens. After those steps LinkedList is disconnected with other nodes and any "setLocator" call would create a new node, however it will not be linked to LinkedList.

An attacker will wait for "Indexer.createIndex()" function call to create a new "Index" contract for a pair of tokens.
Once above transaction is mined, attacker will perform the below transactions to distort the LinkedList maintained in "Index" contract.

Attacker calls "Indexer.setIntent()" by passing token addresses for which new "Index" contract is created. Also passing "stakingAmount = 0", "locator = 0x00". Here, we assume that "locatorWhitelist" address is not set, as it's also not set in mainnet/testnet. Also there is no contract present for "LocatorWhitelist" in the codebase. This function call will not transfer any tokens from attacker and an entry will be made in the LinkedList present in "Index" contract.

Attacker again calls "Indexer.setIntent()" with same arguments as previous step. This will update the links of LinkedList.
Attacker again calls "Indexer.setIntent()" with same arguments as previous step, however this time he passes "locator = 0x01".
Attacker calls "unsetIntent". This will delete the attacker's address node from the LinkedList and HEAD node's "prev" and "next" will point to the attacker's address.
Now if any user calls "Indexer.setIntent", a new node will be created in LinkedList for his account. However, the "prev" and "next" of HEAD will never change.
Using the above steps, the attacker is able to completely distort the LinkedList. This also affected the length of the LinkedList

### Attack Scenario + Proposed Impact

There could be many ways to distort the LinkedList and it could seriously impact other calculations based on the LinkedList.

Thanks & Regards,
Jitendra Chittoda
Skype: jchittoda
Twitter: JChittoda

### Response from Team

Thank you for diving in and explaining the issue clearly! As soon as we saw your initial email, we also dived into the list with an adversarial perspective. We have confirmed the issue on our own end and agree that the repercussions of an input to the Index with locator 0x0 can distort the list and require a re-deploy of an Indexer.

Our solution for resolving this issue is disallowing locator 0x0 in the Index.sol contract. By doing this, it ensures that we can still use a locator 0x0 as an identifier for a non-existent entry and mitigate the issue.

Thanks,
Deepa Sathaye
deepa.sathaye@fluidity.io

## Submission by A.

### Detailed Description

Contract: swap contract

A sender can deploy the swap transaction also on other blockchains (Ethereum fork) or sidechains. The attacker deploy a transaction with same sending address, same destinatary (swap contract) and the same msg.data (swap signature + order) on an other blockchain (example Ethereum Classic). This can produce bad results for the swap signer if the transaction is not reverted.
Assumptions for non-reverting of malicious tx and for the success of the attack:

On Ethereum Classic there is a deployed swap contract with the same address of swap contract on Mainnet

On Ethereum Classic there are deployed erc20 token contracts with the same address of erc20 tokens included in the swap order

On Ethereum Classic the swap contract is aligned with the same on Mainnet (the two contracts containing the same data in storage variables used by swap transaction)

### Attack Scenario

The sender of a swap transaction is the attacker A, the signer is the victim V.
Suppose V signs a swap transaction off-chain in order that A can submits it on-chain and conclude the token swap. A don’t submit transaction on Ethereum Mainnet but on Ethereum Classic and if the previous assumptions are verified, a token swaps on Ethereum Classic will happen.
In this case, V buys and sells different tokens respect of tokens for which he signed and in this way he can have a loss.

### Proposed Impact

This attack can be cause an acceptance of an unfavorable exchange rate different of the exchange rate market (exchange platforms) so it can lead to a loss for the sender.
Example of this attack: https://www.reddit.com/r/GolemProject/comments/71lrad/request_for_golem_developers_comments_58000_lost/

### Solution

I would recommend deploying a dummy swap contract (different from swap contract) at the same address at Ethereum fork-chains and Ethereum Classic. The address of the contract is determined by the creator’s address and the transaction nonce. So, a developer can use the same address that was used to create the contract at the Ethereum mainnet.

### Response from Team

Thanks for submitting to the bug bounty! This issue that you mentioned was already acknowledged by the AirSwap team in the audit report.
Report: https://github.com/airswap/airswap-protocols/blob/master/security/QuantstampAuditReport.pdf

It was marked as a low severity issue with low likelihood of occuring. We are looking forward to EIP-1344 being incorporated into Instanbul upgrade though.

Thanks,
Deepa Sathaye
deepa.sathaye@fluidity.io

## Submission by A.

### Detailed Description

Contract: swap contract

This makes it impossible for the recipient contract to reject incorrect transactions of ERC20 tokens. For the Swap contract, it means that users can (and will) deposit their tokens via the transfer function, and the transaction will be completed successfully. Tokens will not be credited to the customer’s account. These tokens will be trapped inside the contract forever without the possibility of their recovery.

This is a list of links to this kind of bug with several loss:
https://github.com/ethereum/eips/issues/223
https://www.reddit.com/r/ethereum/comments/6c68mw/new_record_holder_appears_lets_congratulate/
https://www.reddit.com/r/ethtrader/comments/7lplwk/ive_accidentally_sent_130000_worth_of_salt_tokens/
https://www.reddit.com/r/ethereum/comments/6e8y9o/the_ens_contract_becomes_token_holder_erc20/
https://twitter.com/Dexaran/status/1108822849438052354

### Attack Scenario

Swap Smart-contract assume that users will only deposit tokens using the approve+transferFrom pattern, but if a user uses transfer function, this will lead to the fact that the deposit will be sent to the contract, but will not be credited to the user’s balance. So tokens will be frozen forever.
It should be noted that sending tokens into a certain address at your exchange is a standard procedure of making deposits in crypto industry thus it is an intuitively-clear method of depositing crypto assets so assuming that users will never make this mistake is wrong.

Moreover, assuming that users are responsible for this kind of decisions is also wrong and it is described at the https://en.wikipedia.org/wiki/Vulnerability_(computing)#Software_vulnerabilities , paragraph: https://en.wikipedia.org/wiki/Victim_blaming.

In addition, is not secure to rely on an assumption that the problem can be solved at UI side because AirSwap will have multiple variations of UI implemented by random developers and we can not guarantee that none of UI developers will make even a single mistake in the future.

### Proposed Impact

This attack can produce a direct impact of users with tokens frozen as in situations described in the previous links.
Moreover, it can produce also an indirect impact on your exchange because if some tokens were frozen you would have some bad publicity.
So this issue should be classified as high severity.

### Solution

I suggest to implement an “owner emergency extraction function” in the swap contract that will serve to extract the “stuck” tokens from the contract. Then you can send this tokens back to users because it is relatively easy to recognize who this tokens belong to with a use of history of transactions.
This solution is centralized but it’s better than frozen tokens:
Function extractToken (address \_token, address \_recipient, uint256 \_amount) external onlyOwner { uint256 initialBalance = INRERC20(\_token).balanceOf(\_recipient); INRERC20(token).transfer(\_recipient, \_amount); require(initialBalance.add(\_amount) == INRERC20(\_token).balanceOf(\_recipient), "TRANSFER_FAILED"); }
Please note: It is a better solution using erc20Wrapper than check balance as suggested by audit report

### Response from Team

Thanks for the submission!

We have documented that this is a potential scenario that could arise within the security section of the repo. The Swap contract is non-custodial so we have chosen not to provide a backdoor recovery. This was also documented within the V1 audit of the contracts. In addition, none of the application layer products allow this behavior.

"Tokens can however be sent to the contract by accident, and will remain as there is no withdrawal mechanism for any of the supported token standards. Looking at the Swap V1 contract (0x8fd3121013a07c57f0d69646e86e7a4880b467b7), there is 0 ether and < \$.10 stored, so we are comfortable without implementing a recovery backdoor."

https://github.com/airswap/airswap-protocols/blob/master/source/swap/reports/SECURITY.md

Thanks

## Submission by A.

### Detailed Description

Contract: Indexer contract

There is a list of 120 tokens that implemented erc20 token standard without a return value
for transfer and transferFrom function (due to incorrect OpenZeppelin
implementation). If the stakingToken variable of the Indexer contract contains the
address of one of this 120 tokens, the function setIntent and unsetIntent could fail if
transfer or transferFrom reverts. In this case, the user can not stake tokens and so
he can’t increase/decrease his score.

### Attack Scenario

StakingToken is the address of an Erc20 token with missing return value of Transfer
function. An user has X amount of token in stake and decide to take tokens back. He calls
unsetIntent function that will fail because transfer function revert since transfer works
but return a casual value that may be false. So the user has lost X token.

### Proposed Impact

This attack can produce a direct impact of users with tokens for ever frozen since transfer
function can not work due the bug of stakingToken contract.

### Solution

I suggest to use a wrapper called SafeErc20 implemented by Openzeppelin. This wrapper
uses inline assembly to manage the case of erc20 tokens without return value of transfer
function.
This is the link of the wrapper: https://github.com/OpenZeppelin/openzeppelin-
contracts/blob/master/contracts/token/ERC20/SafeERC20.sol

### Response from Team

Thanks for reaching out! We've reviewed the issue that you've described. Unfortunately, it does not qualify for a reward as this behavior is working as intended and thus there is no critical impact.

The design of the protocol is that the token used for staking within the Indexer does have to be a standard ERC20 token. We have an open documentation item about this behavior: https://github.com/airswap/airswap-protocols/issues/227

The staking token that is used in the Delegate and Indexer would not support non-standard ERC20. The only scenario, though unlikely, where this scenario could manifest is if a party were to create an Indexer with a non-standard ERC20 token in the constructor. In addition, then others would have to create a Delegate referencing this Indexer contract. Thus, there would be a non-functional Indexer and Delegate though users are not at risk of losing locked ether or other tokens, outside of gas fees.

The actual token transfer functions within the Swap.sol contract does take into account non-standard ERC20 contracts. Thus, the Swap protocol will support tokens such as USDT and BNB. While the contract does not use SafeERC20.sol from OpenZeppelin, we created a custom interface as a workaround. It also takes into account non-standard ERC721 contracts as not all ERC721 implement safeTransferFrom.