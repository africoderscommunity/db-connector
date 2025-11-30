import { useState } from 'react'
import { isStructured } from '../../../utils/formatters'

export function useJsonModal(handleEdit) {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalContent, setModalContent] = useState('')
  const [editingCell, setEditingCell] = useState(null)

  const handleCellClick = (cell, i, j) => {
    if (isStructured(cell)) {
      try {
        const formatted =
          typeof cell === 'string'
            ? JSON.stringify(JSON.parse(cell), null, 2)
            : JSON.stringify(cell, null, 2)
        setModalContent(formatted)
        setModalOpen(true)
        setEditingCell({ i, j })
      } catch {
        setModalContent(String(cell))
        setModalOpen(true)
        setEditingCell({ i, j })
      }
    }
  }

  const handleSaveJsonEdit = () => {
    try {
      const parsed = JSON.parse(modalContent)
      const { i, j } = editingCell
      handleEdit(i, j, parsed)
      setModalOpen(false)
    } catch (err) {
      alert('❌ Invalid JSON format')
    }
  }

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(modalContent)
  }

  return {
    modalOpen,
    modalContent,
    editingCell: editingCell ? `${editingCell.i}_${editingCell.j}` : null,
    setEditingCell: (value) => setEditingCell(value),
    setModalOpen,
    setModalContent,
    handleCellClick,
    handleSaveJsonEdit,
    handleCopyToClipboard,
  }
}
