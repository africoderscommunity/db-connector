export default function DiscardModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-6 w-[500px]">
        <h2 className="text-lg font-semibold text-white mb-4">
          Discard Changes
        </h2>
        <p className="text-gray-300 mb-6">
          Are you sure you want to discard all unsaved changes?
        </p>
        <div className="flex justify-end gap-4">
          <button
            className="px-4 py-2 bg-gray-700 text-gray-200 rounded"
            onClick={onClose}
          >
            No
          </button>
          <button
            className="px-4 py-2 bg-red-600 text-white rounded"
            onClick={onConfirm}
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  )
}
