require('dotenv').config({ path: '../../.env' })

const { createClient } = require('redis')
const config = require('../build/redis/redis.config.js')

async function main() {
  if (!process.env.REDISCLOUD_URL) {
    console.log('process.env.REDISCLOUD_URL must be set.')
    process.exit(-1)
  }
  const client = createClient({
    url: process.env.REDISCLOUD_URL,
  })
  try {
    await client.connect()
    await client.flushAll()
    await config['default'](client)
    console.log('Flushed and created Redis indexes.')
    process.exit(0)
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}
main()
