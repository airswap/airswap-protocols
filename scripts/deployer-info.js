const Confirm = require('prompt-confirm')
const {
  chainNames,
  chainCurrencies,
  EVM_NATIVE_TOKEN_DECIMALS,
} = require('@airswap/utils')

module.exports = {
  confirmDeployment: async (deployer, targetAddress) => {
    const gasPrice = await deployer.getGasPrice()
    const chainId = await deployer.getChainId()
    const balance = ethers.utils.formatUnits(
      (await deployer.getBalance()).toString(),
      EVM_NATIVE_TOKEN_DECIMALS
    )
    console.log(`To ${chainNames[chainId].toUpperCase()}`)
    console.log(`· Gas price         ${gasPrice / 10 ** 9} gwei`)
    console.log(`· Deployer wallet   ${deployer.address}`)
    console.log(`· Deployer balance  ${balance} ${chainCurrencies[chainId]}`)

    const nextAddress = ethers.utils.getContractAddress({
      from: deployer.address,
      nonce: await deployer.provider.getTransactionCount(deployer.address),
    })

    console.log(`· Contract address  ${nextAddress}\n`)

    const prompt = new Confirm(
      nextAddress === targetAddress || !targetAddress
        ? 'Proceed to deploy?'
        : 'Address would not match mainnet. Proceed anyway?'
    )
    return await prompt.run()
  },
}
