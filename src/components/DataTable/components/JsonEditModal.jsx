export default function JsonEditModal({
  isOpen,
  modalContent,
  onContentChange,
  onSave,
  onCopy,
  onClose,
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-6 w-[650px] max-h-[80vh] overflow-auto shadow-2xl border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">Edit Object</h2>
          <div className="flex gap-3">
            <button
              onClick={onCopy}
              className="px-3 py-1 text-xs bg-gray-800 rounded hover:bg-gray-700 text-gray-200"
            >
              Copy
            </button>
            <button
              onClick={onSave}
              className="px-3 py-1 text-xs bg-green-600 rounded hover:bg-green-700 text-white"
            >
              Save
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 text-xs bg-red-600 rounded hover:bg-red-700 text-white"
            >
              Close
            </button>
          </div>
        </div>

        <textarea
          className="w-full bg-gray-800 text-gray-200 rounded-lg p-4 text-sm font-mono resize-none"
          style={{ height: '60vh' }}
          value={modalContent}
          onChange={(e) => onContentChange(e.target.value)}
        />
      </div>
    </div>
  )
}
