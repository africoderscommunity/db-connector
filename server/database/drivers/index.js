import { MySQLDriver } from './MySQLDriver.js'
import { PostgresDriver } from './PostgresDriver.js'
import { MSSQLDriver } from './MSSQLDriver.js'
import { MongoDriver } from './MongoDriver.js'
import { RedisDriver } from './RedisDriver.js'

export const DRIVERS = {
  mysql: MySQLDriver,
  postgresql: PostgresDriver,
  mssql: MSSQLDriver,
  mongodb: MongoDriver,
  redis: RedisDriver,
}

export function getClass(type) {
  console.log({type})
  const Driver = DRIVERS[type]
  if (!Driver) throw new Error(`Unknown DB type: ${type}`)
  return Driver
}