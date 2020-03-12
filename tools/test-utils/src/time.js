/*
 * Use of code from https://medium.com/edgefund/time-travelling-truffle-tests-f581c1964687
 * Utility functions to advance blocktime and mine blocks artificially for EVM
 */
const { SECONDS_IN_DAY } = require('@airswap/constants')
const helper = require('ganache-time-traveler')

const getLatestTimestamp = async () => {
  return (await web3.eth.getBlock('latest')).timestamp
}

const getTimestampPlusDays = async days => {
  return (await getLatestTimestamp()) + SECONDS_IN_DAY * days
}

module.exports = {
  advanceTime: helper.advanceTime,
  advanceBlock: helper.advanceBlock,
  advanceBlockAndSetTime: helper.advanceBlockAndSetTime,
  advanceTimeAndBlock: helper.advanceTimeAndBlock,
  takeSnapshot: helper.takeSnapshot,
  revertToSnapshot: helper.revertToSnapshot,
  getLatestTimestamp,
  getTimestampPlusDays,
}
