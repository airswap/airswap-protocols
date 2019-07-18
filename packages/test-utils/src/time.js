/* global web3,  */ // ignore those keywords when linting
/*
 * Use of code from https://medium.com/edgefund/time-travelling-truffle-tests-f581c1964687
 * Utility functions to advance blocktime and mine blocks artificially for EVM
 */
const SECONDS_IN_DAY = 86400

advanceTime = time => {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send(
      {
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [time],
        id: new Date().getTime(),
      },
      (err, result) => {
        if (err) {
          return reject(err)
        }
        return resolve(result)
      }
    )
  })
}

advanceBlock = () => {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send(
      {
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: new Date().getTime(),
      },
      (err, result) => {
        if (err) {
          return reject(err)
        }
        const newBlockHash = web3.eth.getBlock('latest').hash

        return resolve(newBlockHash)
      }
    )
  })
}

takeSnapshot = () => {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send(
      {
        jsonrpc: '2.0',
        method: 'evm_snapshot',
        id: new Date().getTime(),
      },
      (err, snapshotId) => {
        if (err) {
          return reject(err)
        }
        return resolve(snapshotId)
      }
    )
  })
}

revertToSnapShot = id => {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send(
      {
        jsonrpc: '2.0',
        method: 'evm_revert',
        params: [id],
        id: new Date().getTime(),
      },
      (err, result) => {
        if (err) {
          return reject(err)
        }
        return resolve(result)
      }
    )
  })
}

advanceTimeAndBlock = async time => {
  await advanceTime(time)
  await advanceBlock()
  return Promise.resolve(web3.eth.getBlock('latest'))
}

getLatestTimestamp = async () => {
  return (await web3.eth.getBlock('latest')).timestamp
}

getTimestampPlusDays = async days => {
  return (await getLatestTimestamp()) + SECONDS_IN_DAY * days
}

module.exports = {
  advanceTime,
  advanceBlock,
  advanceTimeAndBlock,
  takeSnapshot,
  revertToSnapShot,
  getLatestTimestamp,
  getTimestampPlusDays,
}
