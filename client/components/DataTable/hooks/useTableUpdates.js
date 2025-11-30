import { useState, useRef } from 'react'
import { buildSingleUpdateQuery, buildBulkUpdateQuery } from '../utils/queryBuilders'

export function useTableUpdates(tableData, setTableData, dbType, selectedTable, setQueryText, executeQuery) {
  const [changedCells, setChangedCells] = useState({})
  const [pendingQuery, setPendingQuery] = useState('')
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [discardModalOpen, setDiscardModalOpen] = useState(false)
  const originalDataRef = useRef(JSON.parse(JSON.stringify(tableData)))

  const handleEdit = (rowIndex, colIndex, value) => {
    setTableData((prev) => {
      const newRows = prev.rows.map((r) => [...r])
      newRows[rowIndex][colIndex] = value
      return { ...prev, rows: newRows }
    })

    setChangedCells((prev) => ({
      ...prev,
      [`${rowIndex}_${colIndex}`]: value,
    }))
  }

  const handleUpdate = (rowIndex) => {
    const result = buildSingleUpdateQuery(
      dbType,
      selectedTable,
      tableData,
      rowIndex,
      changedCells
    )

    if (!result) {
      alert('No changes detected for this row.')
      return
    }

    const { queryString, updateData } = result

    // Set query string for UI
    setQueryText(queryString)
    console.log({ queryString }, 'single update', executeQuery)

    // Execute
    executeQuery(queryString, updateData)

    // Clear changed cells for this row
    setChangedCells((prev) => {
      const updated = { ...prev }
      tableData.columns.forEach((_, idx) => {
        delete updated[`${rowIndex}_${idx}`]
      })
      return updated
    })
  }

  const handleUpdateAll = () => {
    if (!Object.keys(changedCells).length) {
      alert('No changes detected to save!')
      return
    }

    const queryString = buildBulkUpdateQuery(
      dbType,
      selectedTable,
      tableData,
      changedCells
    )

    setPendingQuery(queryString)
    setConfirmModalOpen(true)
  }

  const confirmUpdateAll = () => {
    console.log({ pendingQuery }, 'multiple update')
    executeQuery(pendingQuery)
    setConfirmModalOpen(false)
    setChangedCells({})
  }

  const handleDiscard = () => {
    if (Object.keys(changedCells).length > 0) {
      const revertedData = JSON.parse(JSON.stringify(originalDataRef.current))
      setTableData({ ...revertedData })
      setChangedCells({})
    }
    setDiscardModalOpen(false)
  }

  return {
    changedCells,
    pendingQuery,
    confirmModalOpen,
    discardModalOpen,
    handleEdit,
    handleUpdate,
    handleUpdateAll,
    confirmUpdateAll,
    handleDiscard,
    setConfirmModalOpen,
    setDiscardModalOpen,
  }
}
