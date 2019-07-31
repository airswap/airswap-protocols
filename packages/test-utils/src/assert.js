const truffleAssert = require('truffle-assertions')

module.exports = {
  notEmitted: truffleAssert.eventNotEmitted,
  emitted: truffleAssert.eventEmitted,
  reverted: truffleAssert.reverts,
  getResult: truffleAssert.createTransactionResult,
  passes: truffleAssert.passes,
  fails: truffleAssert.fails,
  equal: assert.equal,
  notEqual: assert.notEqual,
  ok: assert.ok,
}
