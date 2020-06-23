const Indexer = artifacts.require('Indexer')

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

module.exports = async (deployer, network) => {
  if (network == 'rinkeby' || network == 'mainnet') {
    // fill in the address of this contract

    let indexer = await Indexer.at("0xbA9aB9710Bd461F30C247f4cA2Cb7f453C22570e")

    const cUSDC = "0x39AA39c021dfbaE8faC545936693aC917d5E7563"
    const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
    const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
    const TUSD = "0x0000000000085d4780B73119b644AE5ecd22b376"
    const BUSD = "0x4Fabb145d64652a948d72533023f6E7A623C7C53"
    const CHI = "0x0000000000004946c0e9F43F4Dee607b0eF1fA1c"
    const GST2 = "0x0000000000b3F879cb30FE243b4Dfee438691c04"

    const tokens = [cUSDC, WETH, DAI, USDC, TUSD, BUSD, CHI, GST2]

    const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
    const protocol = "0x0000"


    // await asyncForEach(tokens.slice(7), async (token) => {
    //   await indexer.createIndex(
    //     token,
    //     USDT,
    //     protocol
    //   )
    //   console.log(token + " -> " + USDT)

    //   await indexer.createIndex(
    //     USDT,
    //     token,
    //     protocol
    //   )
    //   console.log(USDT + " -> " + token)
    // })

    await asyncForEach(tokens, async (token) => {
      let dir1 = await indexer.indexes(token, USDT, protocol)
      console.log(token + " -> " + USDT + ": " + dir1)

      let dir2 = await indexer.indexes(USDT, token, protocol)
      console.log(USDT + " -> " + token + ": " + dir2)
    })
  }
}
