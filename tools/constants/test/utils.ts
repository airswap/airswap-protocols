import { expect } from 'chai'
import { protocolInterfaces } from '../index'

import { getInterfaceId } from '@airswap/utils'

describe('Constants', async () => {
  it('InterfaceIds are correct', async () => {
    for (const interfaceId in protocolInterfaces) {
      expect(getInterfaceId(protocolInterfaces[interfaceId])).to.be.equal(
        interfaceId
      )
    }
  })
})
