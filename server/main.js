import { app, BrowserWindow, ipcMain,dialog } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import mysql from 'mysql2/promise';
import os from 'os';
import { Client as  PgClient } from 'pg';
import { MongoClient } from 'mongodb';
import sql from 'mssql';
import { parse } from 'json2csv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { connectMongo } from './database/mongoDB.js';
import { connectMssql } from './database/mssql.js';
import { connectPostgress } from './database/postgres.js';
import { connectMysql } from './database/mysql.js';
import { ObjectId } from 'mongodb';
import { MssqlPrimaryAndUniqueIndexes } from './database/queries/sql.js';
import { MongoDoPrimaryAndUniqueIndexes , mongoDbDatabases } from './database/queries/mongodb.js'
import { deleteTable, getTableStructure, getTableData } from './database/queries/index.js'
import { EJSON } from "bson";
import { DbEngine } from './dbEngineController.js';

// Recreate __dirname and __filename for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import dotenv from 'dotenv';
dotenv.config();

let mainWindow;
const isDev = process.env.NODE_ENV === 'development';
// Store active connections
const activeConnections = new Map();
const primaryUnique = new Map();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    // icon: path.join(__dirname, '../build/icon.png')
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    // mainWindow.loadFile(path.join(__dirname, './dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
 const buildColumnsAndRows = (docs) => {
    const allColumns = Array.from(
      docs.reduce((cols, doc) => {
        Object.keys(doc).forEach((k) => cols.add(k));
        return cols;
      }, new Set())
    );
   
    return {
      columns: allColumns,
      rows: docs.map((doc) =>
        {
         doc= EJSON.serialize(doc)
          
          return allColumns.map((col) => (col in doc ? doc[col] : null))}
      ),
    };
  };
// ============================================
// IPC Handlers for Database Operations
// ============================================

// Test Connection
ipcMain.handle('db:test-connection', async (event, config) => {
  try {
    switch (config.type) {
      case 'mysql':
        return await testMySQLConnection(config);
      case 'postgresql':
        return await testPostgreSQLConnection(config);
      case 'mongodb':
        return await testMongoDBConnection(config);
      case 'mssql':
        return await testMSSQLConnection(config);
      default:
        return { success: false, error: 'Unknown database type' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Connect to Database
 
ipcMain.handle('db:connect', async (event, config) => {
  let databases
  try {
    let PrimaryUnique;
    let connection;
    switch (config.type) {
      case 'mysql':
        connection = await connectMysql(config)
        PrimaryUnique = {}
        break;
        
      case 'postgresql':
        connection = await connectPostgress(config)
        await connection.connect();
        PrimaryUnique = {}

        break;
        
      case 'mongodb':
        connection = await connectMongo(config.mongoUrlLink)
        databases = await mongoDbDatabases(connection)
        PrimaryUnique = await MongoDoPrimaryAndUniqueIndexes(connection)
        break;
        
      case 'mssql':
        connection = await connectMssql(config);
        PrimaryUnique = (await connection.query(
         MssqlPrimaryAndUniqueIndexes
        )).recordset
        // console.log({PrimaryUnique})

        break;
        
      default:
        return { success: false, error: 'Unknown database type' };
    }
    
    activeConnections.set(config.id, { connection, config , databases});
    activeConnections.set("currentActiveDatabase", config.id);
    primaryUnique.set(config.id,PrimaryUnique)


    // ✅ Send event to renderer after connection success
    // if (window) {
      mainWindow.webContents.send('db:connected', {
        id: config.id,
        type: config.type,
        databases,
        message: `${config.type.toUpperCase()} connected successfully!`,
      });
    // }
    return { success: true , databases};
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get Tables
ipcMain.handle('db:get-tables', async (event, {connectionId,db,refresh = false}) => {
  try {
    let allQueries = ''
    const conn = activeConnections.get(connectionId);
    if (!conn) throw new Error('Please connect your database');
    
    let tables = [];
    
    switch (conn.config.type) {
      case 'mysql':
        const [rows] = await conn.connection.query('SHOW TABLES');
        tables = rows.map(row => Object.values(row)[0]);
        break;
        
      case 'postgresql':
        const result = await conn.connection.query(
          "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
        );
        tables = result.rows.map(row => row.tablename);
        break;
        
     case 'mongodb': {
    const mongoConn = activeConnections.get(conn.config.id);
    const database = conn.connection.db(db || conn.db  );

    // Check cache or refresh
    if (refresh || !mongoConn?.allTables?.[db]) {
      const collections = await database.listCollections().toArray();
      tables = collections.map(c => c.name);
    } else {
      tables = mongoConn.allTables[db];
    }

    // Update cache
    activeConnections.set(conn.config.id, {
      ...mongoConn,
      tables,
      allTables: { ...(mongoConn?.allTables || {}), [db||conn.db]: tables },
      db: db || conn.db 
    });

    break;
  }

  case 'mssql': {
    const mssqlConn = activeConnections.get(conn.config.id);

    // Reusable query
    const query = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'";

    // Check cache or refresh
    if (refresh || !mssqlConn?.allTables?.[db]) {
      const result = await conn.connection.query(query);
      tables = result.recordset.map(row => row.TABLE_NAME);
    } else {
      tables = mssqlConn.allTables[db];
    }

    // Update cache
    activeConnections.set(conn.config.id, {
      ...mssqlConn,
      tables,
      allTables: { ...(mssqlConn?.allTables || {}), [db]: tables },
    });

    break;
  }
    }
    activeConnections.set("currentActiveDatabase", connectionId);
    
    return { success: true, tables , allQueries};
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get Table Data
ipcMain.handle('db:get-table-data', async (event, { connectionId, tableName, limit = 100 ,offset = 0 }) => {
  try {
    let allQueries = ''
    let totalCount = ""
    const conn = activeConnections.get(connectionId);
    if (!conn) throw new Error('Please connect your database');
    
    let columns = [];
    let rows = [];
    
    switch (conn.config.type) {
      case 'mysql':
        const [mysqlRows] = await conn.connection.query(
          `SELECT * FROM \`${tableName}\` LIMIT ${limit}`
        );
        if (mysqlRows.length > 0) {
          columns = Object.keys(mysqlRows[0]);
          rows = mysqlRows.map(row => Object.values(row));
        }
        break;
        
      case 'postgresql':
        const pgResult = await conn.connection.query(
          `SELECT * FROM "${tableName}" LIMIT ${limit}`
        );
        if (pgResult.rows.length > 0) {
          columns = Object.keys(pgResult.rows[0]);
          rows = pgResult.rows.map(row => Object.values(row));
        }
        break;
        
      case 'mongodb':
        const db = conn.connection.db(conn.db);
        const collection = db.collection(tableName);
        const docs = await collection.find().limit(limit).toArray();
        if (docs.length > 0) {
        ({ columns, rows } = buildColumnsAndRows(docs));

          // columns = Object.keys(docs[0]);
        //   const allColumns = Array.from(
        //   docs.reduce((cols, doc) => {
        //     Object.keys(doc).forEach(k => cols.add(k));
        //     return cols;
        //   }, new Set())
        // );
        //     columns = allColumns;
        //     rows = docs.map(doc =>
        //   allColumns.map(col => (col in doc ? doc[col] : null)).map((v)=>typeof v === 'object' ? JSON.stringify(v) : v)
        // );
        }
        break;
        
case 'mssql': {
  const schema = 'dbo'; // You can make this dynamic later if needed

  // 1️⃣ Get first available column name to use for ORDER BY
  const columnsQuery = `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = '${tableName}'
      AND TABLE_SCHEMA = '${schema}'
    ORDER BY ORDINAL_POSITION;
  `;
  allQueries+= columnsQuery  + '<->'

  const columnsResult = await conn.connection.query(columnsQuery);
  const firstColumn = columnsResult?.recordset?.[0]?.COLUMN_NAME || null;

  // 2️⃣ Build ORDER BY clause safely
  const orderClause = firstColumn ? `ORDER BY [${firstColumn}]` : `ORDER BY (SELECT NULL)`;
  allQueries+=  orderClause  + '<->'


  // 3️⃣ Main paginated query
  const query = `
    SELECT * FROM [${schema}].[${tableName}]
    ${orderClause}
    OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY;
  `;
  allQueries+=   query  + '<->'

  // 4️⃣ Count query
  const countQuery = `
    SELECT COUNT(*) AS count FROM [${schema}].[${tableName}];
  `;
  allQueries+=   countQuery   + '<->'

  // 5️⃣ Run both in parallel
  const [mssqlResult, countResult] = await Promise.all([
    conn.connection.query(query),
    conn.connection.query(countQuery)
  ]);

  // 6️⃣ Extract columns and rows
  if (mssqlResult.recordset.length > 0) {
    columns = Object.keys(mssqlResult.recordset[0]);
    rows = mssqlResult.recordset.map(row => Object.values(row));
  }

  // 7️⃣ Extract total count
  totalCount = countResult.recordset[0]?.count || 0;
  break;
}

    }
    activeConnections.set("currentActiveDatabase", connectionId);

    return { success: true, data: { columns, rows, totalCount, allQueries } };
  } catch (error) {

    return { success: false, error: error.message };
  }
});
ipcMain.handle('db:get:session', async (event, databaseName = "") => {
  return Object.fromEntries(
    Array.from(activeConnections.entries()).map(([connectionId, connData]) => {
      if (connectionId === "currentActiveDatabase") {
        return [connectionId, connData]; // return as-is, no transformation
      }
    const primaryUniqueKey = primaryUnique.get(connectionId)


      return [
        connectionId,
        {
          status: true,
          connectionId,
          config: {
            name: connData?.config?.name,
            type: connData?.config?.type,
            id: connData?.config?.id,
            database: connData?.config?.database,
          },
          allTables: connData?.allTables,
          tables: connData?.tables,
          databases: connData?.databases,
          primaryUniqueKey,
          autoCompletion:connData.autoCompletion
        },
      ];
    })
  );
});



ipcMain.handle('db:delete:table', async (event, { connection, tableName }) => {
 const conn = activeConnections.get(connection.id);
  if (!conn) throw new Error('Please connect your database');
  return await deleteTable(conn, tableName);
});

ipcMain.handle('db:get:structure', async (event, {connection,tableName}) => {
  console.log({tableName,connection,})
 const conn = activeConnections.get(connection.id);
  if (!conn) throw new Error('Please connect your database');

  return await getTableStructure(conn,tableName); 
});

ipcMain.handle('db:execute-query', async (event, { connectionId, query ,queryObject }) => {
  try {
    let allQueries = ""
    const conn = activeConnections.get(connectionId);
    
    if (!conn) throw new Error('Please connect your database');
    
    const startTime = Date.now();
    let columns = [];
    let rows = [];
    let rowsAffected = 0;
    
switch (conn.config.type) {
  // 🟡 MYSQL
  case "mysql": {
    const [mysqlResult] = await conn.connection.query(query);
    if (Array.isArray(mysqlResult) && mysqlResult.length > 0) {
      columns = Object.keys(mysqlResult[0]);
      rows = mysqlResult.map((row) => Object.values(row));
      rowsAffected = mysqlResult.length;
    } else {
      rowsAffected = mysqlResult.affectedRows || 0;
    }
    break;
  }

  // 🟣 POSTGRESQL
  case "postgresql": {
    const pgResult = await conn.connection.query(query);
    if (pgResult.rows.length > 0) {
      columns = Object.keys(pgResult.rows[0]);
      rows = pgResult.rows.map((row) => Object.values(row));
    }
    rowsAffected = pgResult.rowCount;
    break;
  }

  // 🔵 MSSQL
  case "mssql": {
    const mssqlResult = await conn.connection.query(query);

    if (mssqlResult.recordset && mssqlResult.recordset.length > 0) {
      columns = Object.keys(mssqlResult.recordset[0]);
      rows = mssqlResult.recordset.map((row) => Object.values(row));
      rowsAffected = mssqlResult.recordset.length;
    } else if (mssqlResult.rowsAffected && mssqlResult.rowsAffected.length > 0) {
      rowsAffected = mssqlResult.rowsAffected[0] || 0;
    } else {
      rowsAffected = 0;
    }
    break;
  }

// 🟢 MONGODB
case "mongodb": {
  console.log({queryObject})
  console.log(JSON.stringify(EJSON.serialize(queryObject)))
  const db = conn.connection.db(conn.db);
  const mongoMatch = query.trim();
  console.log({ mongoMatch });

  // Flexible regex for all MongoDB ops (find, aggregate, insert, update, delete, bulkWrite)
  // const match = mongoMatch.match(/^db\.([\w.$]+)\.(\w+)\s*\(([\s\S]*)\)\s*;?$/);
  // Updated regex — handles both `db.createCollection(...)` and `db.collection.operation(...)`
const match = mongoMatch.match(/^db(?:\.([\w.$]+))?\.(\w+)\s*\(([\s\S]*)\)\s*;?$/);

  if (!match) throw new Error("Invalid MongoDB query format");

  const [_, collectionName, operation, rawParams] = match;


let collection = null;
if (collectionName) {
  // collection = db.collection(maybeCollection);
 collection = db.collection(collectionName);

}
 
  const safeEval = (str) => {
  try {
    if (!str) return [];

    const normalized = str
      .replace(/ObjectId\(['"]?([a-fA-F0-9]{24})['"]?\)/g, `new ObjectId("$1")`)
      .replace(/ISODate\(['"]?(.+?)['"]?\)/g, `new Date("$1")`);

    const splitParams = [];
    let depth = 0, current = "";
    for (let i = 0; i < normalized.length; i++) {
      const ch = normalized[i];
      if (ch === "{" || ch === "[" || ch === "(") depth++;
      if (ch === "}" || ch === "]" || ch === ")") depth--;
      if (ch === "," && depth === 0) {
        splitParams.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    if (current.trim()) splitParams.push(current.trim());

    return splitParams.map(p =>
      Function("ObjectId", "Date", `"use strict"; return (${p || "{}"})`)(ObjectId, Date)
    );
  } catch (err) {
    console.error("safeEval parse error:", err);
    return [];
  }
};


  const parsedParams = safeEval(rawParams);

  // ✅ Handle MongoDB operations with rows & columns
 

  switch (operation) {
    case "find": {
      const [filter = {}, options = {}] = parsedParams;
      const docs = await collection.find(filter, options).limit(100).toArray();
      ({ columns, rows } = buildColumnsAndRows(docs));
      rowsAffected = docs.length;
      console.log({columns, rows,docs})

      break;
    }

    case "aggregate": {
      const pipeline = Array.isArray(parsedParams[0]) ? parsedParams[0] : parsedParams;
      const docs = await collection.aggregate(pipeline).toArray();
      ({ columns, rows } = buildColumnsAndRows(docs));
      console.log({columns, rows,docs})

      rowsAffected = docs.length;
      break;
    }

    case "insertOne": {
      const [doc] = parsedParams;
      const result = await collection.insertOne(doc);
      rowsAffected = result.insertedId ? 1 : 0;
      columns = Object.keys(doc);
      rows = [Object.values(doc)];
      break;
    }

    case "insertMany": {
      const [docs] = parsedParams;
      const result = await collection.insertMany(docs);
      rowsAffected = result.insertedCount;
      columns = docs.length ? Object.keys(docs[0]) : [];
      rows = docs.map((doc) => Object.values(doc));
      break;
    }
 case "createCollection": {
    const [collectionName, options = {}] = parsedParams;
    const existing = await db.listCollections({ name: collectionName }).next();
    if (existing) throw new Error(`Collection "${collectionName}" already exists`);
    await db.createCollection(collectionName, options);
    columns = ["Operation", "Collection"];
    rows = [["createCollection", collectionName]];
    rowsAffected = 1;
    break;
  }
    case "updateOne":
case "updateMany": {
  const [filter, update, options = {}] = parsedParams;
  const isMany = operation === "updateMany";

  const result = isMany
    ? await collection.updateMany(filter, update, options)
    : await collection.updateOne(filter, update, options);

  rowsAffected = result.modifiedCount || 0;

  // ✅ Return confirmation info instead of fetching data
  columns = ["Operation", "Matched", "Modified"];
  rows = [
    [operation,  result.matchedCount,  result.modifiedCount,]

  ];
  break;
}

case "deleteOne":
case "deleteMany": {
  const [filter] = parsedParams;
  const isMany = operation === "deleteMany";

  const result = isMany
    ? await collection.deleteMany(filter)
    : await collection.deleteOne(filter);

  rowsAffected = result.deletedCount || 0;

  // ✅ Return confirmation info
  columns = ["Operation", "Deleted"];
  rows = [
     [operation, result.deletedCount,]
    
  ];
  break;
}

case "bulkWrite": {
  const [operations] = parsedParams;
  const result = await collection.bulkWrite(operations);

  rowsAffected =
    result.modifiedCount || result.insertedCount || result.deletedCount || 0;

  // ✅ Return summary of the bulk operation
  columns = ["Operation", "Inserted", "Modified", "Deleted"];
  rows = [
     ["bulkWrite",result.insertedCount || 0, result.modifiedCount || 0,result.deletedCount || 0,]
  ];
  break;
}


    default:
      throw new Error(`Unsupported MongoDB operation: ${operation}`);
  }
  break;
}




  default:
    throw new Error(`Unsupported database type: ${conn.config.type}`);
}


    
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(3) + 's';
    activeConnections.set("currentActiveDatabase", connectionId);
    
    return {
      success: true,
      data: {
        columns,
        rows,
        rowsAffected,
        executionTime,
        allQueries
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Disconnect
ipcMain.handle('db:disconnect', async (event, connectionId) => {
  return await dbDisconnect(activeConnections,connectionId) 
});
ipcMain.handle('db:export-table', async (event, { connection, tableName, format }) => {
  try {
    if (!connection || !tableName || !format) {
      throw new Error('Missing parameters');
    }

    // ✅ Get table data from your existing dbManager
    const tableData = await getTableData({ connection, tableName });
    if (!tableData || !Array.isArray(tableData.rows)) {
      throw new Error('No data found or invalid table response');
    }

    const rows = tableData.rows;
    let fileContent;
    let defaultExt;
    let filters;

    // ✅ Prepare file content by format
    switch (format) {
      case 'json':
        fileContent = JSON.stringify(rows, null, 2);
        defaultExt = 'json';
        filters = [{ name: 'JSON File', extensions: ['json'] }];
        break;

      case 'csv':
        fileContent = parse(rows);
        defaultExt = 'csv';
        filters = [{ name: 'CSV File', extensions: ['csv'] }];
        break;

      case 'sql':
        defaultExt = 'sql';
        filters = [{ name: 'SQL File', extensions: ['sql'] }];

        const columns = Object.keys(rows[0] || {});
        const insertStatements = rows.map((row) => {
          const values = columns
            .map((col) => {
              const val = row[col];
              if (val === null || val === undefined) return 'NULL';
              if (typeof val === 'number') return val;
              return `'${String(val).replace(/'/g, "''")}'`;
            })
            .join(', ');
          return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values});`;
        });
        fileContent = insertStatements.join('\n');
        break;

      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    // 🗂 Ask user where to save the file
    const { filePath } = await dialog.showSaveDialog({
      title: `Export ${tableName} as ${format.toUpperCase()}`,
      defaultPath: path.join(os.homedir(), `${tableName}.${defaultExt}`),
      filters,
    });

    if (!filePath) {
      return { success: false, message: 'Export cancelled by user' };
    }

    // 💾 Save file
    await fs.writeFile(filePath, fileContent, 'utf8');


    return {
      success: true,
      message: `Table "${tableName}" exported successfully as ${format.toUpperCase()}`,
      filePath,
    };
  } catch (err) {
    console.error('Export failed:', err);
    return { success: false, message: err.message };
  }
});




ipcMain.handle('db:get-columns', async (event, { connectionId, table }) => {
  try {
    const conn = activeConnections.get(connectionId);
    if (!conn) throw new Error('Please connect your database');

    let columns = [];

    switch (conn.config.type) {
      // 🟡 MYSQL
      case "mysql": {
        const [mysqlResult] = await conn.connection.query(
          `SHOW COLUMNS FROM \`${table}\`;`
        );
        if (Array.isArray(mysqlResult)) {
          columns = mysqlResult.map((c) => ({
            name: c.Field,
            type: c.Type,
            nullable: c.Null === 'YES',
            key: c.Key,
            default: c.Default,
            extra: c.Extra
          }));
        }
        break;
      }

      // 🟣 POSTGRESQL
      case "postgresql": {
        const query = `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `;
        const res = await conn.connection.query(query, [table]);
        columns = res.rows.map((c) => ({
          name: c.column_name,
          type: c.data_type,
          nullable: c.is_nullable === 'YES',
          default: c.column_default
        }));
        break;
      }

      // 🔵 MSSQL
      case "mssql": {
        const query = `
          SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = @table
          ORDER BY ORDINAL_POSITION
        `;
        const request = conn.connection.request();
        request.input('table', sql.NVarChar, table);
        const result = await request.query(query);
        columns = result.recordset.map((c) => ({
          name: c.COLUMN_NAME,
          type: c.DATA_TYPE,
          nullable: c.IS_NULLABLE === 'YES',
          default: c.COLUMN_DEFAULT
        }));
         const metadata = {};
        //  metadata[table] = columns.map((c) => c.name);
         const mssqlConn = activeConnections.get(conn.config.id);

            activeConnections.set(conn.config.id, {
      ...mssqlConn,
      autoCompletion:{
        ...mssqlConn.autoCompletion,
        [ table ]: columns.map((c) => c.name)
      }
    });

        table
        break;
      }

      // 🟢 MONGODB
      case "mongodb": {
        const db = conn.connection.db(conn.db);
        const sampleDoc = await db.collection(table).findOne();
        if (sampleDoc) {
          columns = Object.keys(sampleDoc).map((k) => ({
            name: k,
            type: typeof sampleDoc[k],
          }));
        }
        break;
      }

      default:
        throw new Error(`Unsupported database type: ${conn.config.type}`);
    }

    return { success: true, columns };
  } catch (err) {
    console.error('❌ getColumns error:', err);
    return { success: false, error: err.message };
  }
});


 












ipcMain.handle('list-binaries', async () => {
  return DbEngine.listBinaries();
});

ipcMain.handle('list-instances', async () => {
  return DbEngine.listInstances();
});

ipcMain.handle('create-instance', async (event, engine, port, version) => {
  return await DbEngine.createInstance(engine, port, version);
});

ipcMain.handle('start-instance', async (event, id) => {
  return DbEngine.startInstance(id);
});

ipcMain.handle('stop-instance', async (event, id) => {
  return DbEngine.stopInstance(id);
});

ipcMain.handle('delete-instance', async (event, id) => {
  return DbEngine.deleteInstance(id);
});

ipcMain.handle('get-connection-info', async (event, id) => {
  return DbEngine.getConnectionInfo(id);
});

ipcMain.handle('get-instance-logs', async (event, id) => {
  return DbEngine.getInstanceLogs(id);
});
 














// Test connection functions
async function testMySQLConnection(config) {
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.username,
    password: config.password,
    database: config.database
  });
  await connection.end();
  return { success: true };
}

async function testPostgreSQLConnection(config) {
  console.log({config})
  const client = new PgClient({
    host: config.host,
    port: config.port,
    user: config.username,
    password: config.password,
    database: config.database
  });
  await client.connect();
  await client.end();
  return { success: true };
}

async function testMongoDBConnection(config) {
  const client = await MongoClient.connect(
       `${config.mongoUrlLink}`
  );
  await client.close();
  return { success: true };
}

async function testMSSQLConnection(config) {
  const pool = await sql.connect({
    server: config.host,
    port: parseInt(config.port),
    user: config.username,
    password: config.password,
    database: config.database,
    options: {
      encrypt: true,
      trustServerCertificate: true
    }
  });
  await pool.close();
  return { success: true };
}
