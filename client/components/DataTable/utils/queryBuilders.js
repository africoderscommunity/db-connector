import { formatSqlValue } from '../../../utils/formatters'

export function buildSingleUpdateQuery(
  dbType,
  selectedTable,
  tableData,
  rowIndex,
  changedCells
) {
  const row = tableData.rows[rowIndex]
  const primaryKey = tableData.columns[0]
  const primaryKeyValue = row[0]

  // Build object of changed values
  const updateObj = {}
  tableData.columns.forEach((col, idx) => {
    const key = `${rowIndex}_${idx}`
    if (key in changedCells) updateObj[col] = row[idx]
  })

  if (!Object.keys(updateObj).length) {
    return null
  }

  if (dbType === 'mssql') {
    const updates = Object.entries(updateObj)
      .map(([col, val]) => `${col} = ${formatSqlValue(val)}`)
      .join(', ')
    return {
      queryString: `UPDATE ${selectedTable || 'my_table'} SET ${updates} WHERE ${primaryKey} = '${primaryKeyValue}';`,
      updateData: null,
    }
  } else if (dbType === 'mongodb') {
    let filterString

    if (primaryKey === '_id') {
      filterString =
        typeof primaryKeyValue === 'object' && '$oid' in primaryKeyValue
          ? `{ _id: ObjectId("${primaryKeyValue.$oid}") }`
          : primaryKeyValue
    } else {
      filterString = `{ ${primaryKey}: "${primaryKeyValue}" }`
    }

    const updatePart = JSON.stringify({ $set: updateObj }, null, 2)

    return {
      queryString: `db.${selectedTable || 'my_collection'}.updateOne(
  ${filterString},
  ${updatePart}
);`,
      updateData: { $set: updateObj },
    }
  }

  return null
}

export function buildBulkUpdateQuery(
  dbType,
  selectedTable,
  tableData,
  changedCells
) {
  if (dbType === 'mssql') {
    const queries = []

    Object.keys(changedCells).forEach((key) => {
      const [rowIndex, colIndex] = key.split('_').map(Number)
      const row = tableData.rows[rowIndex]
      const col = tableData.columns[colIndex]
      const val = row[colIndex]
      const formatted = formatSqlValue(val)

      queries[rowIndex] = queries[rowIndex] || []
      queries[rowIndex].push(`${col} = ${formatted}`)
    })

    const queryStrings = queries
      .map((rowUpdates, i) => {
        if (!rowUpdates) return null
        const primaryKey = tableData.columns[0]
        const primaryKeyValue = tableData.rows[i][0]
        return `UPDATE ${selectedTable || 'my_table'} SET ${rowUpdates.join(
          ', '
        )} WHERE ${primaryKey} = '${primaryKeyValue}';`
      })
      .filter(Boolean)
      .join('\n')

    return queryStrings
  } else if (dbType === 'mongodb') {
    const bulkActions = []

    Object.keys(changedCells).forEach((key) => {
      const [rowIndex, colIndex] = key.split('_').map(Number)
      const row = tableData.rows[rowIndex]
      const col = tableData.columns[colIndex]
      const primaryKey = tableData.columns[0]
      const primaryKeyValue = row[0]

      let existingAction = bulkActions.find(
        (a) => a.updateOne.filter[primaryKey] === primaryKeyValue
      )

      if (!existingAction) {
        existingAction = {
          updateOne: {
            filter: { [primaryKey]: primaryKeyValue },
            update: { $set: {} },
          },
        }
        bulkActions.push(existingAction)
      }

      existingAction.updateOne.update.$set[col] = row[colIndex]
    })

    const bulkWriteString =
      `db.${selectedTable}.bulkWrite([\n` +
      bulkActions
        .map(
          (a) =>
            `  {\n    updateOne: {\n      filter: { ${Object.keys(
              a.updateOne.filter
            )
              .map((k) => `${k}: ObjectId(${a.updateOne.filter[k]})`)
              .join(', ')} },\n      update: ${JSON.stringify(
              a.updateOne.update,
              null,
              8
            )}\n    }\n  }`
        )
        .join(',\n') +
      `\n]);`

    return bulkWriteString
  }

  return null
}
