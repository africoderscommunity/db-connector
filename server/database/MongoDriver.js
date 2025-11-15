import { BaseDriver } from './BaseDriver.js'
import { MongoClient } from 'mongodb'

import { ObjectId } from 'mongodb'
import { EJSON } from 'bson'

import {
  MongoDoPrimaryAndUniqueIndexes,
  mongoDbDatabases,
} from './queries/mongodb.js'

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
}
