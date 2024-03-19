const {
  chainNames,
  chainCurrencies,
  EVM_NATIVE_TOKEN_DECIMALS,
} = require('@airswap/utils')

module.exports = {
  displayDeployerInfo: async function (deployer) {
    const gasPrice = await deployer.getGasPrice()
    const chainId = await deployer.getChainId()
    const balance = ethers.utils.formatUnits(
      (await deployer.getBalance()).toString(),
      EVM_NATIVE_TOKEN_DECIMALS
    )
    console.log(`\nNetwork: ${chainNames[chainId].toUpperCase()}`)
    console.log(`Gas price: ${gasPrice / 10 ** 9} gwei`)
    console.log(`\nDeployer: ${deployer.address}`)
    console.log(`Balance: ${balance} ${chainCurrencies[chainId]}`)

    console.log(
      `\nNext contract address will be:\n${ethers.utils.getContractAddress({
        from: deployer.address,
        nonce: await deployer.provider.getTransactionCount(deployer.address),
      })}\n`
    )
  },
}
