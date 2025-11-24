import { BaseDriver } from './BaseDriver.js'
import { createClient } from 'redis'
export class RedisDriver extends BaseDriver {
  async getColumns(table, { limit, offset }) {
    const pattern =
      table === '__keys__' || table === '(no keys found)' ? '*' : `${table}:*`

    // SCAN
    const keys = []
    for await (const key of this.conn.connection.scanIterator({
      MATCH: pattern,
      COUNT: 100,
    })) {
      keys.push(key)
      if (keys.length >= limit + offset) break
    }

    const paginated = keys.slice(offset, offset + limit)

    const rows = await Promise.all(
      paginated.map(async ([key]) => {
        const type = await this.conn.connection.type(key)
        const ttl = await this.conn.connection.ttl(key)
        let value

        switch (type) {
          case 'string':
            value = await this.conn.connection.get(key)
            break
          case 'hash':
            value = await this.conn.connection.hGetAll(key)
            break
          case 'list':
            value = await this.conn.connection.lRange(key, 0, -1)
            break
          case 'set':
            value = await this.conn.connection.sMembers(key)
            break
          case 'zset':
            value = await this.conn.connection.zRange(key, 0, -1)
            break
          default:
            value = null
        }

        return { key, type, value, ttl }
      })
    )

    return [
      { name: 'key' },
      { name: 'type' },
      { name: 'value' },
      { name: 'ttl' },
    ]
  }

  static async testConnection(config) {
    const client = createClient({
      socket: {
        host: config.host,
        port: parseInt(config.port) || 6379,
      },
      password: config.password || undefined,
      database: parseInt(config.database) || 0,
    })

    try {
      await client.connect()

      const result = await client.ping()
      if (result !== 'PONG') throw new Error('Redis PING test failed')

      await client.quit()
      return { success: true }
    } catch (error) {
      if (client.isOpen) await client.quit()
      throw error
    }
  }
  async executeQuery(query) {
    const startTime = Date.now()
    const conn = this.conn.connection
    const parts = query.trim().split(/\s+/)
    const command = parts[0].toUpperCase()
    const args = parts.slice(1)

    let columns = [],
      rows = [],
      rowsAffected = 0,
      result
    console.log(command, conn.get)

    switch (command) {
      case 'GET':
        result = await conn.get(args[0])
        columns = ['key', 'value']
        rows = [[args[0], result]]
        rowsAffected = result ? 1 : 0
        break
      case 'SET':
        result = await conn.set(args[0], args.slice(1).join(' '))
        columns = ['operation', 'key', 'status']
        rows = [['SET', args[0], result]]
        rowsAffected = 1
        break
      case 'DEL':
        result = await conn.del(args)
        columns = ['operation', 'keys_deleted']
        rows = [['DEL', result]]
        rowsAffected = result
        break

      case 'KEYS':
        result = await conn.keys(args[0] || '*')
        columns = ['key']
        rows = result.map((key) => [key])
        rowsAffected = result.length
        break

      // Hash commands
      case 'HGETALL':
        result = await conn.hGetAll(args[0])
        columns = ['field', 'value']
        rows = Object.entries(result)
        rowsAffected = rows.length
        break

      case 'HGET':
        result = await conn.hGet(args[0], args[1])
        columns = ['key', 'field', 'value']
        rows = [[args[0], args[1], result]]
        rowsAffected = result ? 1 : 0
        break

      case 'HSET':
        result = await conn.hSet(args[0], args[1], args.slice(2).join(' '))
        columns = ['operation', 'key', 'field', 'status']
        rows = [['HSET', args[0], args[1], result]]
        rowsAffected = 1
        break
      case 'LRANGE':
        const start = parseInt(args[1]) || 0
        const stop = parseInt(args[2]) || -1
        result = await conn.lRange(args[0], start, stop)
        columns = ['index', 'value']
        rows = result.map((val, idx) => [start + idx, val])
        rowsAffected = result.length
        break

      case 'LPUSH':
      case 'RPUSH':
        const pushMethod = command === 'LPUSH' ? 'lPush' : 'rPush'
        result = await conn[pushMethod](args[0], args.slice(1))
        columns = ['operation', 'key', 'length']
        rows = [[command, args[0], result]]
        rowsAffected = 1
        break

      // Set commands
      case 'SMEMBERS':
        result = await conn.sMembers(args[0])
        columns = ['member']
        rows = result.map((member) => [member])
        rowsAffected = result.length
        break

      case 'SADD':
        result = await conn.sAdd(args[0], args.slice(1))
        columns = ['operation', 'key', 'added']
        rows = [['SADD', args[0], result]]
        rowsAffected = result
        break
      // Sorted Set commands
      case 'ZRANGE':
        const zStart = parseInt(args[1]) || 0
        const zStop = parseInt(args[2]) || -1
        result = await conn.zRange(args[0], zStart, zStop)
        columns = ['rank', 'member']
        rows = result.map((member, idx) => [zStart + idx, member])
        rowsAffected = result.length
        break

      case 'ZADD':
        result = await conn.zAdd(args[0], {
          score: parseFloat(args[1]),
          value: args[2],
        })
        columns = ['operation', 'key', 'added']
        rows = [['ZADD', args[0], result]]
        rowsAffected = result
        break

      // Generic commands
      case 'TYPE':
        result = await conn.type(args[0])
        columns = ['key', 'type']
        rows = [[args[0], result]]
        rowsAffected = 1
        break

      case 'TTL':
        result = await conn.ttl(args[0])
        columns = ['key', 'ttl']
        rows = [[args[0], result]]
        rowsAffected = 1
        break
      case 'EXPIRE':
        result = await conn.expire(args[0], parseInt(args[1]))
        columns = ['operation', 'key', 'status']
        rows = [['EXPIRE', args[0], result ? 'success' : 'failed']]
        rowsAffected = result ? 1 : 0
        break

      case 'PING':
        result = await conn.ping()
        columns = ['response']
        rows = [[result]]
        rowsAffected = 1
        break
      default:
        throw new Error(`Unsupported Redis command: ${command}`)
    }

    return {
      columns,
      rows,
      rowsAffected,
      executionTime: ((Date.now() - startTime) / 1000).toFixed(3) + 's',
    }
  }
  async createTable(tableName) {
    try {
      const client = this.conn.connection

      // In Redis, we create a "table" by creating an initial key with the pattern
      // For example: tableName:_meta will store metadata about this pattern
      const metaKey = `${tableName}:_meta`

      // Check if pattern already exists
      const existingKeys = []
      for await (const key of client.scanIterator({
        MATCH: `${tableName}:*`,
        COUNT: 10,
      })) {
        existingKeys.push(key)
        if (existingKeys.length >= 1) break
      }

      if (existingKeys.length > 0) {
        throw new Error(`Pattern '${tableName}' already exists with ${existingKeys.length} key(s)`)
      }

      // Create a metadata key to establish the pattern
      await client.set(
        metaKey,
        JSON.stringify({
          created: new Date().toISOString(),
          pattern: tableName,
          description: `Key pattern for ${tableName}`,
        })
      )

      return {
        success: true,
        message: `Pattern '${tableName}' created successfully. Use '${tableName}:key_name' to add keys to this pattern.`,
      }
    } catch (error) {
      console.error('Redis createTable error:', error)
      return {
        success: false,
        message: error.message || 'Failed to create pattern',
      }
    }
  }
  async getTables(db) {
    console.log({ connection: this.conn })
    const patterns = new Set()
    let count = 0

    for await (const key of this.conn.connection.scanIterator({
      MATCH: '*',
      COUNT: 100,
    })) {
      if (count >= 1000) break
      const pattern = key.includes(':') ? key.split(':')[0] :null

      pattern && patterns.add(pattern)
      count++
    }

    const tables = Array.from(patterns).sort()
    return tables.length > 0 ? tables : []
  }
  async getTableData(pattern, limit = 100, offset = 0) {
    const client = this.conn.connection
    let allQueries = `SCAN 0 MATCH ${pattern}:* COUNT ${limit}`

    const keys = []
    for await (const key of client.scanIterator({
      MATCH: `${pattern}:*`,
      COUNT: 100,
    })) {
      keys.push(key)
      if (keys.length >= limit) break
    }

    const results = []
    for (const key of keys) {
      const type = await client.type(key)

      let value = null
      switch (type) {
        case 'string':
          value = await client.get(key)
          break
        case 'list':
          value = await client.lRange(key, 0, -1)
          break
        case 'hash':
          value = await client.hGetAll(key)
          break
        case 'set':
          value = await client.sMembers(key)
          break
        case 'zset':
          value = await client.zRange(key, 0, -1)
          break
      }

      results.push({ key, type, value })
    }

    return {
      columns: ['key', 'type', 'value'],
      rows: results.map((r) => [r.key, r.type, JSON.stringify(r.value)]),
      totalCount: results.length,
      allQueries,
    }
  }
  async connect(config) {
    const connection = createClient({
      socket: {
        host: config.host,
        port: config.port || 6379,
      },
      password: config.password || undefined,
      database: parseInt(config.database) || 0,
    })

    connection.on('error', (err) => {
      console.error('Redis Client Error:', err)
    })

    await connection.connect()

    console.log(
      `[Redis] Connected to ${config.host}:${config.port}, DB: ${config.database}`
    )

    return {
      connection,
    }
  }
}
