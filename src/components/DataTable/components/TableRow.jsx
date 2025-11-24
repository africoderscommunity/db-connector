import TableCell from './TableCell'
import { isStructured} from '../../../utils/formatters'

export default function TableRow({
  row,
  rowIndex,
  columns,
  changedCells,
  editingCell,
  activeMenu,
  onEdit,
  onCellClick,
  setEditingCell,
  onMenuToggle,
  onUpdate,
}) {
  const rowHasChanges = columns.some((_, j) =>
    changedCells?.hasOwnProperty(`${rowIndex}_${j}`)
  )

  return (
    <tr className="border-t border-gray-700 hover:bg-gray-800 relative">
      {row.map((cell, colIndex) => {
        const isChanged = changedCells?.hasOwnProperty(`${rowIndex}_${colIndex}`)
        const isEditing = editingCell === `${rowIndex}_${colIndex}`

        return (
          <TableCell
            key={colIndex}
            cell={cell}
            rowIndex={rowIndex}
            colIndex={colIndex}
            isChanged={isChanged}
            isEditing={isEditing}
            onEdit={onEdit}
            onClick={(cell, i, j) => {
              const structured =  isStructured(cell)
              if (!structured) setEditingCell(`${i}_${j}`)
              onCellClick(cell, i, j)
            }}
            onBlur={() => setEditingCell(null)}
          />
        )
      })}

      <td className="px-4 py-3 text-center">
        <button
          onClick={() => onMenuToggle(rowIndex)}
          className="px-2 py-1 rounded hover:bg-gray-700 text-gray-300"
        >
          ⋮
        </button>
        {rowHasChanges && activeMenu === rowIndex && (
          <div className="absolute right-5 mt-2 bg-gray-800 border border-gray-700 rounded shadow-lg z-10">
            <button
              onClick={() => onUpdate(rowIndex)}
              className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
            >
              Update Record
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}
