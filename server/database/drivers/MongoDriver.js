import { BaseDriver } from './BaseDriver.js'
import { MongoClient } from 'mongodb'

import { ObjectId } from 'mongodb'
import { EJSON } from 'bson'

 
const  MongoDoPrimaryAndUniqueIndexes = async (client)=> {
  const result = []

  try {
    const admin = client.db().admin()
    const { databases } = await admin.listDatabases()

    for (const dbInfo of databases) {
      const dbName = dbInfo.name
      console.log(`\n📦 Database: ${dbName}`)

      // Skip system databases' internal collections to prevent Unauthorized errors
      const isSystemDB = ['local', 'admin', 'config'].includes(dbName)
      const db = client.db(dbName)

      // Try to list collections
      let collections = []
      try {
        collections = await db.listCollections().toArray()
        // console.log("Collections:", collections.map(c => c.name));
      } catch (err) {
        // console.warn(`⚠️ Skipping ${dbName}: cannot list collections (${err.message})`);
        continue
      }

      // If system DB, skip index fetching (to avoid Unauthorized)
      if (isSystemDB) {
        // console.log(`⏭️ Skipping index check for system database: ${dbName}`);
        continue
      }

      // Loop through all collections in user DBs
      for (const coll of collections) {
        const collection = db.collection(coll.name)
        try {
          const indexes = await collection.indexes()

          indexes.forEach((idx) => {
            Object.keys(idx.key).forEach((field) => {
              result.push({
                DatabaseName: dbName,
                TableName: coll.name,
                ColumnName: field,
                KeyType: idx.unique
                  ? 'UNIQUE'
                  : field === '_id'
                    ? 'PRIMARY'
                    : 'INDEX',
              })
            })
          })
        } catch (err) {
          // console.warn(
          //   `⚠️ Error fetching indexes for ${dbName}.${coll.name}: ${err.message}`
          // );
          continue
        }
      }
    }

    return result
  } catch (error) {
    // console.error("❌ MongoDB Index Fetch Error:", error);
    return []
  }
}

function detectMongoType(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') {
    if (value && value.$oid) return 'ObjectId'
    if (value && value.$date) return 'Date'
    if (value && (value.$numberLong || value.$numberInt || value.$numberDouble))
      return 'Number'
    return 'object'
  }
  return typeof value // 'string', 'number', 'boolean', 'undefined'
}
 const mongoDbDatabases = async (client) => {
  const admin = client.db().admin()
  const { databases } = await admin.listDatabases()
  return databases.map(({ name }) => name)
}
 
export class MongoDriver extends BaseDriver {
  #buildColumnsAndRows(docs) {
    const allColumns = Array.from(
      docs.reduce((cols, doc) => {
        Object.keys(doc).forEach((k) => cols.add(k))
        return cols
      }, new Set())
    )

    let result = {
      columns: allColumns,
      rows: docs.map((doc) => {
        doc = EJSON.serialize(doc)

        return allColumns.map((col) => (col in doc ? doc[col] : null))
      }),
    }
    return result
  }
  async getColumns(table) {
    const db = this.conn.connection.db(this.conn.db)
    const sample = await db.collection(table).findOne()

    if (!sample) return []

    return Object.keys(sample).map((key) => ({
      name: key,
      type: typeof sample[key],
    }))
  }
  static async testConnection(config) {
    const client = await MongoClient.connect(config.mongoUrlLink)
    await client.close()
    return { success: true }
  }
  async executeQuery(query, queryObject) {
    const startTime = Date.now()
    const db = this.conn.connection.db(this.conn.db)

    const match = query
      .trim()
      .match(/^db(?:\.([\w.$]+))?\.(\w+)\s*\(([\s\S]*)\)\s*;?$/)
    if (!match) throw new Error('Invalid MongoDB query format')

    const [_, collectionName, operation, rawParams] = match
    const collection = collectionName ? db.collection(collectionName) : null

    // const safeEval = (str) => {
    //   if (!str) return [];
    //   const normalized = str
    //     .replace(/ObjectId\(['"]?([a-fA-F0-9]{24})['"]?\)/g, `new ObjectId("$1")`)
    //     .replace(/ISODate\(['"]?(.+?)['"]?\)/g, `new Date("$1")`);
    //   return Function("ObjectId", "Date", `"use strict"; return (${normalized})`)(ObjectId, Date);
    // };
    const safeEval = (str) => {
      try {
        if (!str) return []

        const normalized = str
          .replace(
            /ObjectId\(['"]?([a-fA-F0-9]{24})['"]?\)/g,
            `new ObjectId("$1")`
          )
          .replace(/ISODate\(['"]?(.+?)['"]?\)/g, `new Date("$1")`)

        const splitParams = []
        let depth = 0,
          current = ''
        for (let i = 0; i < normalized.length; i++) {
          const ch = normalized[i]
          if (ch === '{' || ch === '[' || ch === '(') depth++
          if (ch === '}' || ch === ']' || ch === ')') depth--
          if (ch === ',' && depth === 0) {
            splitParams.push(current.trim())
            current = ''
          } else {
            current += ch
          }
        }
        if (current.trim()) splitParams.push(current.trim())

        return splitParams.map((p) =>
          Function(
            'ObjectId',
            'Date',
            `"use strict"; return (${p || '{}'})`
          )(ObjectId, Date)
        )
      } catch (err) {
        return []
      }
    }

    const params = safeEval(rawParams)
    let columns = [],
      rows = [],
      rowsAffected = 0
    switch (operation) {
      case 'find': {
        const [filter = {}, options = {}] = params
        const docs = await collection.find(filter, options).limit(100).toArray()
        ;({ columns, rows } = this.#buildColumnsAndRows(docs))
        rowsAffected = docs.length
        break
      }
      case 'aggregate': {
        const pipeline = Array.isArray(params[0]) ? params[0] : params
        const docs = await collection.aggregate(pipeline).toArray()
        ;({ columns, rows } = this.#buildColumnsAndRows(docs))
        rowsAffected = docs.length
        break
      }
      case 'insertOne': {
        const [doc] = params
        const result = await collection.insertOne(doc)
        rowsAffected = result.insertedId ? 1 : 0
        columns = Object.keys(doc)
        rows = [Object.values(doc)]
        break
      }
      case 'insertMany': {
        const [docs] = params
        const result = await collection.insertMany(docs)
        rowsAffected = result.insertedCount
        columns = docs.length ? Object.keys(docs[0]) : []
        rows = docs.map((d) => Object.values(d))
        break
      }
      case 'createCollection': {
        const [collectionName, options = {}] = params
        const existing = await db
          .listCollections({ name: collectionName })
          .next()
        if (existing)
          throw new Error(`Collection "${collectionName}" already exists`)
        await db.createCollection(collectionName, options)
        columns = ['Operation', 'Collection']
        rows = [['createCollection', collectionName]]
        rowsAffected = 1
        break
      }
      case 'updateOne':
      case 'updateMany': {
        const [filter, update, options = {}] = params
        const isMany = operation === 'updateMany'

        const result = isMany
          ? await collection.updateMany(filter, update, options)
          : await collection.updateOne(filter, update, options)

        rowsAffected = result.modifiedCount || 0

        // ✅ Return confirmation info instead of fetching data
        columns = ['Operation', 'Matched', 'Modified']
        rows = [[operation, result.matchedCount, result.modifiedCount]]
        break
      }

      case 'deleteOne':
      case 'deleteMany': {
        const [filter] = params
        const isMany = operation === 'deleteMany'

        const result = isMany
          ? await collection.deleteMany(filter)
          : await collection.deleteOne(filter)

        rowsAffected = result.deletedCount || 0

        // ✅ Return confirmation info
        columns = ['Operation', 'Deleted']
        rows = [[operation, result.deletedCount]]
        break
      }

      case 'bulkWrite': {
        const [operations] = params
        const result = await collection.bulkWrite(operations)

        rowsAffected =
          result.modifiedCount ||
          result.insertedCount ||
          result.deletedCount ||
          0

        // ✅ Return summary of the bulk operation
        columns = ['Operation', 'Inserted', 'Modified', 'Deleted']
        rows = [
          [
            'bulkWrite',
            result.insertedCount || 0,
            result.modifiedCount || 0,
            result.deletedCount || 0,
          ],
        ]
        break
      }
      // ...add updateOne, updateMany, deleteOne, deleteMany, bulkWrite similarly
      default:
        throw new Error(`Unsupported MongoDB operation: ${operation}`)
    }

    return {
      columns,
      rows,
      rowsAffected,
      executionTime: ((Date.now() - startTime) / 1000).toFixed(3) + 's',
    }
  }

  async getTables(db, refresh = false) {
    const mongoConn = this.conn
    const database = this.conn.connection.db(db || this.conn.db)
    console.log(this.conn.db, 654789, { db })

    let tables = mongoConn?.allTables?.[db] || []
    if (refresh || !mongoConn.allTables?.[db]) {
      const collections = await database.listCollections().toArray()
      tables = collections.map((c) => c.name)
    }
    console.log(mongoConn.config.id, 879)
    this.activeConnections.set(mongoConn.config.id, {
      ...mongoConn,
      tables,
      allTables: {
        ...(mongoConn?.allTables || {}),
        [db || this.conn.db]: tables,
      },
      db: db || this.conn.db,
    })
    return tables
  }

  async getTableData(tableName, limit = 100) {
    const db = this.conn.connection.db(this.conn.db)
    const collection = db.collection(tableName)

    const docs = await collection.find().limit(limit).toArray()

    let columns = []
    let rows = []

    if (docs.length > 0) {
      ;({ columns, rows } = await this.#buildColumnsAndRows(docs))
    }
    console.log({ rows, columns })
    return {
      columns,
      rows,
      totalCount: docs.length,
      allQueries: `db.${tableName}.find().limit(${limit})`,
    }
  }
  async connect(config) {
    console.log('here')

    const connection = await MongoClient.connect(`${config.mongoUrlLink}`)
    console.log('here w')
    const [databases, PrimaryUnique] = await Promise.all([
      mongoDbDatabases(connection),
      MongoDoPrimaryAndUniqueIndexes(connection),
    ])
    console.log({
      connection,
      PrimaryUnique,
      databases,
    })

    return {
      connection,
      PrimaryUnique,
      databases,
    }
  }

  async dbDisconnect(conn){
     await conn.connection.close()
  }
    async  deleteTable(connection, tableName) {
 try {
   const db = connection.connection.db(connection.db)
        console.log({ database })
        const collections = await db
          .listCollections({ name: tableName })
          .toArray()

        if (collections.length === 0) {
          return {
            success: false,
            message: `Collection '${tableName}' not found.`,
          }
        }

        await db.collection(tableName).drop()
        return {
          success: true,
          message: `Collection '${tableName}' deleted successfully.`,
        }
 } catch (error) {
  console.error('Error deleting table:', error)
    return { success: false, message: error.message }
 
 }
      }
           async  getTableStructure(conn, tableName) {
const db = conn.connection.db(conn.config.database)
      const coll = db.collection(tableName)

      // 1) get a sample document (your original approach)
      const sample = await coll.findOne()
      if (!sample) return []
      // if (!sample) throw new Error(`No documents found in collection '${tableName}'`);

      // 2) get indexes for THIS collection only
      let indexMap = {} // field -> KeyType ("PRIMARY" | "UNIQUE" | "INDEX")
      try {
        const indexes = await coll.indexes() // returns array of index objects
        indexes.forEach((idx) => {
          // idx.key is an object: { field1: 1, field2: -1 } (compound indexes possible)
          Object.keys(idx.key).forEach((field) => {
            // prefer PRIMARY for _id, otherwise UNIQUE if index.unique is truthy
            const keyType =
              field === '_id' ? 'PRIMARY' : idx.unique ? 'UNIQUE' : 'INDEX'
            // If there are compound indexes, we still mark each field (you can change logic to mark compound)
            // Keep the strongest key type if multiple indexes exist for the same field
            const prev = indexMap[field]
            const rank = (k) =>
              k === 'PRIMARY' ? 3 : k === 'UNIQUE' ? 2 : k === 'INDEX' ? 1 : 0
            if (!prev || rank(keyType) > rank(prev)) indexMap[field] = keyType
          })
        })
      } catch (err) {
        // ignore index errors, still return structure from sample
        console.warn(`Could not read indexes for ${tableName}: ${err.message}`)
      }

      // 3) Build columns array from sample keys + any index-only fields (so indexes not present in sample are included)
      const sampleFields = Object.keys(sample)
      const indexOnlyFields = Object.keys(indexMap).filter(
        (f) => !sampleFields.includes(f)
      )
      const allFields = [...sampleFields, ...indexOnlyFields]

     const  columns = allFields.map((field) => {
        const val = sample[field]
        let type = field in sample ? detectMongoType(val) : 'unknown' // index-only fields -> unknown
        let foreignKey = null

        if (field !== '_id') {
          if (
            val instanceof ObjectId ||
            (typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val))
          ) {
            foreignKey = 'Possible reference (ObjectId)'
          }

          // handle arrays of ObjectIds
          if (
            Array.isArray(val) &&
            val.length > 0 &&
            val.every(
              (v) =>
                v instanceof ObjectId ||
                (typeof v === 'string' && /^[0-9a-fA-F]{24}$/.test(v))
            )
          ) {
            type = 'Array<ObjectId>'
            foreignKey = 'Array of references'
          }
        }

        const nullable = !(field in sample) || sample[field] == null // missing or null -> nullable true
        const key = indexMap[field] || (field === '_id' ? 'PRI' : '')

        return {
          name: field,
          type,
          nullable,
          key,
          default: '',
          extra: '',
          foreignKey,
        }
      })
      return {
        columns
      }
  }
}
