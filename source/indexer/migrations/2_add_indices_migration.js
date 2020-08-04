const Indexer = artifacts.require('Indexer')
const BatchIndices = artifacts.require('BatchIndices')
var _ = require('lodash')

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
    const TUSD = "0x0000000000085d4780B73119b644AE5ecd22b376"
    const BUSD = "0x4Fabb145d64652a948d72533023f6E7A623C7C53"

    const WBTC = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'
    const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
    const AST = '0x27054b13b1b798b345b591a4d22e6562d47ea75a'
    const USDT = '0xdac17f958d2ee523a2206206994597c13d831ec7'
    const CHI = "0x0000000000004946c0e9F43F4Dee607b0eF1fA1c"
    const GST2 = "0x0000000000b3F879cb30FE243b4Dfee438691c04"
    const sUSD = '0x57ab1ec28d129707052df4df418d58a2d46d5f51'

    const pairs = [[WBTC, USDC], [AST, WBTC], [WBTC, USDT], [AST, USDT], [CHI, WBTC], [GST2, WBTC], [WBTC, sUSD]]
    pairArrays = _.unzip(pairs)
    console.log(pairArrays)

    // let batcher = await BatchIndices.new()
    let batcher = await BatchIndices.at('0x5f2c3e30b5e5ad8ceb26dd57b5e5fd498a8fd6cf')
    console.log(`Batcher Address: ${batcher.address}`)

    let gasEstimate = await batcher.createIndices.estimateGas(indexer.address, pairArrays[0], pairArrays[1], "0x0000")
    console.log(gasEstimate)
    let trx = await batcher.createIndices(indexer.address, pairArrays[0], pairArrays[1], "0x0000", { gas: gasEstimate })


    // const tokens = [cUSDC, WETH, DAI, USDC, TUSD, BUSD, CHI, GST2]

    // const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
    // const protocol = "0x0000"


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

    // await asyncForEach(tokens, async (token) => {
    //   let dir1 = await indexer.indexes(token, USDT, protocol)
    //   console.log(token + " -> " + USDT + ": " + dir1)

    //   let dir2 = await indexer.indexes(USDT, token, protocol)
    //   console.log(USDT + " -> " + token + ": " + dir2)
    // })


  }
}
