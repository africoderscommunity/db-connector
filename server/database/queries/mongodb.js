export async function MongoDoPrimaryAndUniqueIndexes(client) {
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

export const mongoDbDatabases = async (client) => {
  const admin = client.db().admin()
  const { databases } = await admin.listDatabases()
  return databases.map(({ name }) => name)
}
