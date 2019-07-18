const truffleAssert = require('truffle-assertions')

module.exports = {
  none: truffleAssert.eventNotEmitted,
  emitted: truffleAssert.eventEmitted,
  reverted: truffleAssert.reverts,
  getResult: truffleAssert.createTransactionResult,
  equal: assert.equal,
  ok: assert.ok,
  passes: assert.passes,
  fails: assert.fails
}
