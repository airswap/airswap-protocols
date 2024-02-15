require('dotenv').config({ path: '../../.env' })

const { createClient } = require('redis')
const { createIndex } = require('../build/redis/redis.index.js')

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
    await createIndex(client)
    console.log(
      `Created index on Redis instance at ${process.env.REDISCLOUD_URL}.`
    )
    process.exit(0)
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}
main()
