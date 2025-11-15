import { MySQLDriver } from './MySQLDriver.js'
import { PostgresDriver } from './PostgresDriver.js'
import { MSSQLDriver } from '../database/ MSSQLDriver.js'
import { MongoDriver } from './MongoDriver.js'
import { RedisDriver } from './RedisDriver.js'

export const DRIVERS = {
  mysql: MySQLDriver,
  postgresql: PostgresDriver,
  mssql: MSSQLDriver,
  mongodb: MongoDriver,
  redis: RedisDriver,
}

export function createDriver(conn, activeConnections) {
  const Driver = DRIVERS[conn.config.type]
  if (!Driver) throw new Error(`Unknown DB type: ${conn.config.type}`)
  return new Driver(conn, activeConnections)
}

export async function testConnection(type, config) {
  const Driver = DRIVERS[type]
  if (!Driver) throw new Error(`Unknown DB type: ${type}`)
  return Driver.testConnection(config)
}
