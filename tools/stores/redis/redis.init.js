require('dotenv').config({ path: '../../.env' })

import reset from './redis.config'

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
    await reset(client)
    process.exit(0)
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}
main()
