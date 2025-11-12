import React from "react";
import { useDatabase } from '../context/DatabaseContext'
import { useAppContext } from '../context/AppContext'

export default function AddConnectionModal() {
 const {
      error, setError,
      formData, setFormData,
      addConnection,testingConnection,
      getDefaultPort,testConnection,
 } = useDatabase()


const {
   showAddForm, setShowAddForm,
} = useAppContext()
  if (!showAddForm) return null;

  const isMongo = formData.type === "mongodb";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">New Database Connection</h2>

        {/* ===== FORM FIELDS ===== */}
        <div className="space-y-4">
          {/* Connection Name */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Connection Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
              placeholder="My Production DB"
            />
          </div>

          {/* Database Type */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Database Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value,
                  port: getDefaultPort(e.target.value),
                })
              }
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="mysql">MySQL</option>
              <option value="postgresql">PostgreSQL</option>
              <option value="mongodb">MongoDB</option>
              <option value="mssql">SQL Server</option>
            </select>
          </div>

          {/* ====== CONDITIONAL FIELDS ====== */}
          {isMongo ? (
            <>
              {/* MongoDB URL */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Mongo URL Link *
                </label>
                <input
                  type="text"
                  value={formData.mongoUrlLink || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, mongoUrlLink: e.target.value })
                  }
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="mongodb+srv://username:password@cluster0.mongodb.net"
                />
              </div>
            </>
          ) : (
            <>
              {/* Host & Port */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Host *</label>
                  <input
                    type="text"
                    value={formData.host}
                    onChange={(e) =>
                      setFormData({ ...formData, host: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder="localhost"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Port
                  </label>
                  <input
                    type="text"
                    value={formData.port}
                    onChange={(e) =>
                      setFormData({ ...formData, port: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder={getDefaultPort(formData.type)}
                  />
                </div>
              </div>

              {/* Database Name */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Database Name *
                </label>
                <input
                  type="text"
                  value={formData.database}
                  onChange={(e) =>
                    setFormData({ ...formData, database: e.target.value })
                  }
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="myapp_db"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="root"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="••••••••"
                />
              </div>
            </>
          )}
        </div>

        {/* ===== ERROR MESSAGE ===== */}
        {error && (
          <div className="mt-4 bg-red-900/50 border border-red-700 text-red-200 p-2 rounded text-sm">
            {error}
          </div>
        )}

        {/* ===== ACTION BUTTONS ===== */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={testConnection}
            disabled={testingConnection}
            className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded font-medium transition disabled:opacity-50"
          >
            {testingConnection ? "Testing..." : "Test Connection"}
          </button>
          <button
            onClick={addConnection}
            className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded font-medium transition"
          >
            Save
          </button>
          <button
            onClick={() => {
              setShowAddForm(false);
              setError("");
            }}
            className="px-4 bg-gray-700 hover:bg-gray-600 py-2 rounded font-medium transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
