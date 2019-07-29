const assert = require('assert')
const truffleAssert = require('truffle-assertions')

module.exports = {
  notEmitted: truffleAssert.eventNotEmitted,
  emitted: truffleAssert.eventEmitted,
  notEmitted: truffleAssert.eventNotEmitted,
  reverted: truffleAssert.reverts,
  getResult: truffleAssert.createTransactionResult,
  passes: truffleAssert.passes,
  fails: truffleAssert.fails,
  equal: assert.equal,
  isTrue: assert.isTrue,
  notEqual: assert.notEqual,
  ok: assert.ok,
}
