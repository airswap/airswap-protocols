/*
 * Use of code from https://medium.com/edgefund/time-travelling-truffle-tests-f581c1964687
 * Utility functions to advance blocktime and mine blocks artificially for EVM
 */
const { SECONDS_IN_DAY } = require('@airswap/order-utils').constants
const helper = require('ganache-time-traveler')

let getLatestTimestamp = async () => {
  return (await web3.eth.getBlock('latest')).timestamp
}

let getTimestampPlusDays = async days => {
  return (await getLatestTimestamp()) + SECONDS_IN_DAY * days
}

module.exports = {
  advanceTime: helper.advanceTime,
  advanceBlock: helper.advanceBlock,
  advanceTimeAndBlock: helper.advanceTimeAndBlock,
  takeSnapshot: helper.takeSnapshot,
  revertToSnapshot: helper.revertToSnapshot,
  getLatestTimestamp,
  getTimestampPlusDays,
}
