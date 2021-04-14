/* eslint-disable no-console */
require('dotenv').config()
const hre = require('hardhat')
const { ethers, artifacts } = hre
const _ = require('lodash')

async function main() {
  await hre.run('compile')
  const [deployer] = await ethers.getSigners()
  console.log(deployer.address)
  const BatchIndicesArtifact = artifacts.require('BatchIndices')
  const batchIndices = await ethers.getContractAt(
    BatchIndicesArtifact.abi,
    '0x82409EcE9464313EeC2C2edEF75cfF287351CE61'
  )
  console.log(`Batch Indices Address: ${batchIndices.address}`)

  const BUSD = '0xe9e7cea3dedca5984780bafc599bd69add087d56'
  const DAI = '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3'
  const USDC = '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d'
  const USDT = '0x55d398326f99059ff775485246999027b3197955'
  const UST = '0x23396cf899ca06c4472205fc903bdb4de249d6fc'
  const VAI = '0x4bd17003473389a42daf6a0a729f6fdb328bbbd7'
  const tokens = [BUSD, DAI, USDC, USDT, UST, VAI]

  const pairs = []
  for (let i = 0; i < tokens.length - 1; i++) {
    for (let j = i + 1; j < tokens.length; j++) {
      pairs.push([tokens[i], tokens[j]])
    }
  }
  console.log(pairs.length)

  const pairArrays = _.unzip(pairs)
  // console.log(pairArrays)
  await batchIndices.createIndices(
    '0x0fEE96B8d44C0fD9E6D6472531E2aD159CCba73d',
    pairArrays[0],
    pairArrays[1],
    '0x0000'
  )
  console.log('done')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
