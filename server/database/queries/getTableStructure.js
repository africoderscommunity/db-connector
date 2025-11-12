 
import mssql from 'mssql'
import { ObjectId } from 'mongodb';

function detectMongoType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') {
    if (value && value.$oid) return 'ObjectId';
    if (value && value.$date) return 'Date';
    if (value && (value.$numberLong || value.$numberInt || value.$numberDouble)) return 'Number';
    return 'object';
  }
  return typeof value; // 'string', 'number', 'boolean', 'undefined'
}
export async function getTableStructure(conn, tableName) {
  const { type } = conn.config || conn.type;
  let columns = [];
  switch (type) {
    case "mysql": {
      const [rows] = await conn.connection.query(`SHOW FULL COLUMNS FROM \`${tableName}\``);
      columns = rows.map((col) => ({
        name: col.Field,
        type: col.Type,
        nullable: col.Null === "YES",
        key: col.Key,
        default: col.Default,
        extra: col.Extra,
      }));
      break;
    }

 
    case "postgresql": {
  // 1️⃣ Column structure including defaults, identity, and foreign keys
  const tableStructureQuery = `
    SELECT
      a.attname AS column_name,
      pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
      a.attnotnull AS not_null,
      coalesce(pg_get_expr(ad.adbin, ad.adrelid), '') AS column_default,
      CASE WHEN seq.relname IS NOT NULL THEN 'YES' ELSE 'NO' END AS is_identity,
      fk.relname AS foreign_table,
      fa.attname AS foreign_column,
      con.conname AS foreign_key_name
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    LEFT JOIN pg_attrdef ad ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
    LEFT JOIN pg_depend d ON d.refobjid = a.attrelid AND d.refobjsubid = a.attnum
    LEFT JOIN pg_class seq ON seq.oid = d.objid AND seq.relkind = 'S'
    LEFT JOIN pg_constraint con ON con.conrelid = c.oid AND con.contype = 'f'
    LEFT JOIN pg_class fk ON fk.oid = con.confrelid
    LEFT JOIN pg_attribute fa ON fa.attrelid = fk.oid AND fa.attnum = ANY(con.confkey)
    WHERE c.relname = $1 AND a.attnum > 0
    ORDER BY a.attnum;
  `;

  // 2️⃣ Table metadata (row count & collation)
  const tableMetaQuery = `
    SELECT
      'PostgreSQL' AS Engine,
      pg_catalog.pg_encoding_to_char(pg_database.encoding) AS Encoding,
      COALESCE(reltuples::bigint, 0) AS Rows
    FROM pg_class
    JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
    JOIN pg_database ON pg_database.datname = current_database()
    WHERE pg_class.relname = $1;
  `;

  const [structureResult, metaResult] = await Promise.all([
    conn.connection.query(tableStructureQuery, [tableName]),
    conn.connection.query(tableMetaQuery, [tableName])
  ]);

  const meta = metaResult.rows[0] || { Engine: 'PostgreSQL', Encoding: 'Unknown', Rows: 0 };

  columns = structureResult.rows.map(col => {

    let dataType = col.data_type;
    return {
      name: col.column_name,
      type: dataType,
      nullable: !col.not_null,
      key: (col.is_identity === 'YES' )? 'PRI' : '',
      default: col.column_default || null,
      extra: col.is_identity === 'YES' ? 'IDENTITY' : '',
      foreign_key: col.foreign_table && col.foreign_column ? `${col.foreign_table}(${col.foreign_column})` : null
    };
  });

  return { columns, meta };


}


    case "sqlite": {
      columns = await new Promise((resolve, reject) => {
        conn.connection.all(`PRAGMA table_info(${tableName});`, (err, rows) => {
          if (err) reject(err);
          else {
            resolve(
              rows.map((col) => ({
                name: col.name,
                type: col.type,
                nullable: !col.notnull,
                key: col.pk ? "PRI" : "",
                default: col.dflt_value,
                extra: "",
              }))
            );
          }
        });
      });
      break;
    }
 
case "mongodb": {
  const db = conn.connection.db(conn.config.database);
  const coll = db.collection(tableName);

  // 1) get a sample document (your original approach)
  const sample = await coll.findOne();
  if (!sample) return []
  // if (!sample) throw new Error(`No documents found in collection '${tableName}'`);

  // 2) get indexes for THIS collection only
  let indexMap = {}; // field -> KeyType ("PRIMARY" | "UNIQUE" | "INDEX")
  try {
    const indexes = await coll.indexes(); // returns array of index objects
    indexes.forEach((idx) => {
      // idx.key is an object: { field1: 1, field2: -1 } (compound indexes possible)
      Object.keys(idx.key).forEach((field) => {
        // prefer PRIMARY for _id, otherwise UNIQUE if index.unique is truthy
        const keyType = field === "_id" ? "PRIMARY" : idx.unique ? "UNIQUE" : "INDEX";
        // If there are compound indexes, we still mark each field (you can change logic to mark compound)
        // Keep the strongest key type if multiple indexes exist for the same field
        const prev = indexMap[field];
        const rank = (k) => (k === "PRIMARY" ? 3 : k === "UNIQUE" ? 2 : k === "INDEX" ? 1 : 0);
        if (!prev || rank(keyType) > rank(prev)) indexMap[field] = keyType;
      });
    });
  } catch (err) {
    // ignore index errors, still return structure from sample
    console.warn(`Could not read indexes for ${tableName}: ${err.message}`);
  }

  // 3) Build columns array from sample keys + any index-only fields (so indexes not present in sample are included)
  const sampleFields = Object.keys(sample);
  const indexOnlyFields = Object.keys(indexMap).filter((f) => !sampleFields.includes(f));
  const allFields = [...sampleFields, ...indexOnlyFields];

  columns = allFields.map((field) => {
    const val = sample[field];
    let type = field in sample ? detectMongoType(val) : "unknown"; // index-only fields -> unknown
  let foreignKey = null;

      if(field!=='_id'){
        
    if ( val instanceof ObjectId || (typeof val === "string" && /^[0-9a-fA-F]{24}$/.test(val))) {
      foreignKey = "Possible reference (ObjectId)";
    }

    // handle arrays of ObjectIds
   if (Array.isArray(val) && val.length > 0 && val.every(v => v instanceof ObjectId || (typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v)))) {
  type = "Array<ObjectId>";
  foreignKey = "Array of references";
}

      }


    const nullable = !(field in sample) || sample[field] == null; // missing or null -> nullable true
    const key = indexMap[field] || (field === "_id" ? "PRI" : "");

    return {
      name: field,
      type,
      nullable,
      key,
      default: "",
      extra: "",
      foreignKey,
    };
  });

  break;
}

// 🔵 MSSQL
case "mssql": {
  const tableStructureQuery = `
    SELECT 
      c.name AS column_name,
      t.name AS data_type,
      c.is_nullable,
      c.is_identity,
      c.max_length,
      c.precision,
      c.scale,
      OBJECT_DEFINITION(c.default_object_id) AS column_default,
      fk.name AS foreign_key_name,
      fk_ref.name AS foreign_table,
      fk_col.name AS foreign_column
    FROM sys.columns c
    JOIN sys.types t ON c.user_type_id = t.user_type_id
    JOIN sys.objects o ON o.object_id = c.object_id
    JOIN sys.schemas s ON s.schema_id = o.schema_id
    LEFT JOIN sys.foreign_key_columns fkc 
      ON fkc.parent_object_id = c.object_id 
      AND fkc.parent_column_id = c.column_id
    LEFT JOIN sys.foreign_keys fk 
      ON fk.object_id = fkc.constraint_object_id
    LEFT JOIN sys.objects fk_ref 
      ON fk_ref.object_id = fkc.referenced_object_id
    LEFT JOIN sys.columns fk_col 
      ON fk_col.column_id = fkc.referenced_column_id 
      AND fk_col.object_id = fk_ref.object_id
    WHERE o.name = @tableName 
      AND s.name = 'dbo'
    ORDER BY c.column_id;
  `;

  const tableMetaQuery = `
    SELECT 
      'MSSQL' AS Engine,
      d.collation_name AS Collation,
      SUM(p.rows) AS [Rows]
    FROM sys.tables t
    INNER JOIN sys.partitions p 
      ON t.object_id = p.object_id 
      AND p.index_id IN (0, 1)
    CROSS JOIN sys.databases d
    WHERE t.name = @tableName
      AND d.name = DB_NAME()
    GROUP BY d.collation_name;
  `;

  const request = conn.connection.request();
  request.input("tableName", mssql.NVarChar, tableName);

  // Run both structure + meta queries
  const [structureResult, metaResult] = await Promise.all([
    request.query(tableStructureQuery),
    conn.connection
      .request()
      .input("tableName", mssql.NVarChar, tableName)
      .query(tableMetaQuery),
  ]);

  const meta = metaResult.recordset[0] || {
    Engine: "Unknown",
    Collation: "Unknown",
    Rows: 0,
  };

  const columns = structureResult.recordset.map((col) => {
    let dataType = col.data_type;
    if (["nvarchar", "varchar", "char", "nchar"].includes(col.data_type)) {
      dataType += `(${col.max_length === -1 ? "MAX" : col.max_length})`;
    } else if (["decimal", "numeric"].includes(col.data_type)) {
      dataType += `(${col.precision},${col.scale})`;
    } else if (["datetime2"].includes(col.data_type)) {
      dataType += `(${col.scale})`;
    } else if (["int", "float", "bigint", "smallint"].includes(col.data_type)) {
      dataType += `(${col.max_length})`;
    }

    const foreignKey =
      col.foreign_table && col.foreign_column
        ? `dbo.${col.foreign_table}(${col.foreign_column})`
        : null;
    return {
      name: col.column_name,
      type: dataType,
      nullable: col.is_nullable ? "YES" : "NO",
      key: col.is_identity ? "PRI" : "",
      default: col.column_default || null,
      extra: col.is_identity ? "IDENTITY" : "",
      foreign_key: foreignKey,
    };
  });

  return {
    columns,
    meta,
  };
}




    default:
      throw new Error(`Unsupported database type: ${type}`);
  }

  return columns;
}

