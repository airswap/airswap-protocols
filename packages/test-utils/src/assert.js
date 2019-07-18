const truffleAssert = require('truffle-assertions')

module.exports = {
  none: truffleAssert.eventNotEmitted,
  emitted: truffleAssert.eventEmitted,
  reverted: truffleAssert.reverts,
  getResult: truffleAssert.createTransactionResult,
  passes: truffleAssert.passes,
  fails: truffleAssert.fails,
  equal: assert.equal,
  ok: assert.ok
}
