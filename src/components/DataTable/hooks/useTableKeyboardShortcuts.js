import { useEffect } from 'react'

export function useTableKeyboardShortcuts(changedCells, handleUpdateAll, setDiscardModalOpen) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        Object.keys(changedCells).length
          ? handleUpdateAll()
          : alert('No changes detected to save!')
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault()
        if (Object.keys(changedCells).length) {
          setDiscardModalOpen(true)
        } else {
          window.location.reload()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [changedCells, handleUpdateAll, setDiscardModalOpen])
}
