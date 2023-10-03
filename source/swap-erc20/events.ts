import { ethers } from 'ethers'
import { SwapERC20, FullSwapERC20 } from '@airswap/types'
import { SwapERC20__factory } from '@airswap/swap-erc20/typechain/factories/contracts'
import { abi as ERC20_ABI } from '@openzeppelin/contracts/build/contracts/ERC20.json'

const swapInterface = new ethers.utils.Interface(SwapERC20__factory.abi)
const erc20Interface = new ethers.utils.Interface(ERC20_ABI)

const parseTransfer = (log: any) => {
  let parsed
  let transfer
  try {
    parsed = erc20Interface.parseLog(log)
    if (parsed.name === 'Transfer')
      transfer = {
        token: log.address,
        from: parsed.args[0],
        to: parsed.args[1],
        amount: ethers.BigNumber.from(parsed.args[2]),
      }
  } catch (e) {
    return null
  }
  return transfer
}

export const getFullSwapERC20 = async (
  event: SwapERC20,
  tx: ethers.providers.TransactionResponse
): Promise<FullSwapERC20> => {
  const receipt = await tx.wait()
  const transfers: any = []
  for (let i = 0; i < receipt.logs.length; i++) {
    let parsed: ethers.utils.LogDescription
    try {
      parsed = swapInterface.parseLog(receipt.logs[i])
    } catch (e) {
      continue
    }
    if (parsed && parsed.name === 'SwapERC20') {
      let transfer: any
      while (i--) {
        if ((transfer = parseTransfer(receipt.logs[i]))) {
          transfers.push(transfer)
        }
      }
      break
    }
  }

  const [fee, signer, sender] = transfers
  if (fee.from !== event.signerWallet)
    throw new Error(
      'unable to get SwapERC20 params: found incorrect fee transfer (wrong signerWallet)'
    )
  if (signer.from !== event.signerWallet)
    throw new Error(
      'unable to get SwapERC20 params: found incorrect signer transfer (wrong signerWallet)'
    )
  if (signer.from !== sender.to)
    throw new Error(
      'unable to get SwapERC20 params: signer transfer mismatched sender transfer'
    )
  if (sender.from !== signer.to)
    throw new Error(
      'unable to get SwapERC20 params: sender transfer mismatched signer transfer'
    )

  return {
    ...event,
    signerToken: signer.token,
    signerAmount: signer.amount.toString(),
    senderWallet: sender.from,
    senderToken: sender.token,
    senderAmount: sender.amount.toString(),
    feeAmount: fee.amount.toString(),
  }
}
