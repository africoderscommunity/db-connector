import { isStructured, formatValue } from '../../../utils/formatters'

export default function TableCell({
  cell,
  rowIndex,
  colIndex,
  isChanged,
  isEditing,
  onEdit,
  onClick,
  onBlur,
}) {
  const structured = isStructured(cell)

  return (
    <td
      className={`px-4 py-3 text-sm text-gray-300 ${
        structured
          ? 'cursor-pointer text-blue-400 underline'
          : 'cursor-text'
      } ${isChanged ? 'bg-yellow-900/30 border-l-2 border-yellow-500' : ''}`}
      onClick={() => onClick(cell, rowIndex, colIndex)}
    >
      {isEditing && !structured ? (
        <input
          autoFocus
          className="bg-gray-900 text-gray-300 px-4 py-4 w-full"
          value={cell}
          onChange={(e) => onEdit(rowIndex, colIndex, e.target.value)}
          onBlur={onBlur}
        />
      ) : (
        formatValue(cell)
      )}
    </td>
  )
}
