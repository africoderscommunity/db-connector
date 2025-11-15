import React, { useState, useEffect } from 'react'
import {
  Database,
  Play,
  Square,
  Trash2,
  Plus,
  Copy,
  RefreshCw,
  Info,
  Terminal,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
} from 'lucide-react'

export default function DatabaseManager() {
  const [instances, setInstances] = useState([])
  const [binaries, setBinaries] = useState({})
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedInstance, setSelectedInstance] = useState(null)
  const [connectionInfo, setConnectionInfo] = useState(null)
  const [notification, setNotification] = useState(null)
  const [downloadProgress, setDownloadProgress] = useState(null)

  // Create instance state
  const [createEngine, setCreateEngine] = useState('mongo')
  const [createPort, setCreatePort] = useState('')
  const [createVersion, setCreateVersion] = useState('latest')

  // Access Electron IPC
  const dbEngine = window.electron?.dbEngine
  console.log({ instances })
  useEffect(() => {
    if (dbEngine) {
      loadData()
    }
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [instancesList, binariesList] = await Promise.all([
        dbEngine.listInstances(),
        dbEngine.listBinaries(),
      ])
      setInstances(instancesList)
      setBinaries(binariesList)
      console.log({ binariesList })
    } catch (error) {
      showNotification('Error loading data: ' + error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }
  const handleSetPassword = async (id) => {
    try {
      // Call Electron main process via IPC
      const updatedInstance = await window.api.db.setPasswordEnabled(id)
      alert(
        'Password authentication enabled. Restart PostgreSQL instance to apply changes.'
      )
      setInstances((prev) =>
        prev.map((inst) => (inst.id === id ? updatedInstance : inst))
      )
    } catch (err) {
      console.error(err)
      alert('Failed to enable password: ' + err.message)
    }
  }

  const handleCreateInstance = async () => {
    if (!dbEngine) {
      showNotification('Database engine not available', 'error')
      return
    }

    setLoading(true)
    setDownloadProgress(`Creating ${createEngine} instance...`)

    try {
      const port = createPort ? parseInt(createPort) : undefined
      await dbEngine.createInstance(createEngine, port, createVersion)

      showNotification(
        `${createEngine.toUpperCase()} instance created successfully!`
      )
      setShowCreateModal(false)
      setCreateEngine('mongo')
      setCreatePort('')
      setCreateVersion('latest')
      await loadData()
    } catch (error) {
      showNotification(`Failed to create instance: ${error.message}`, 'error')
    } finally {
      setLoading(false)
      setDownloadProgress(null)
    }
  }

  const handleStartInstance = async (id) => {
    if (!dbEngine) return

    setLoading(true)
    try {
      const updatedInstances = await dbEngine.startInstance(id)
      setInstances(updatedInstances)
      showNotification('Instance started successfully!')
    } catch (error) {
      showNotification(`Failed to start instance: ${error.message}`, 'error')
      await loadData()
    } finally {
      setLoading(false)
    }
  }

  const handleStopInstance = async (id) => {
    if (!dbEngine) return

    setLoading(true)
    try {
      const updatedInstances = await dbEngine.stopInstance(id)
      setInstances(updatedInstances)
      showNotification('Instance stopped successfully!')
    } catch (error) {
      showNotification(`Failed to stop instance: ${error.message}`, 'error')
      await loadData()
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteInstance = async (id) => {
    if (!dbEngine) return

    if (
      !confirm(
        'Are you sure you want to delete this instance? All data will be lost.'
      )
    ) {
      return
    }

    setLoading(true)
    try {
      await dbEngine.deleteInstance(id)
      showNotification('Instance deleted successfully!')
      await loadData()
    } catch (error) {
      showNotification(`Failed to delete instance: ${error.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleShowConnectionInfo = async (id) => {
    if (!dbEngine) return

    try {
      const info = await dbEngine.getConnectionInfo(id)
      setConnectionInfo(info)
      setSelectedInstance(id)
    } catch (error) {
      showNotification(
        `Failed to get connection info: ${error.message}`,
        'error'
      )
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    showNotification('Copied to clipboard!')
  }

  const getEngineIcon = (engine) => {
    const icons = {
      mongo: '🍃',
      postgres: '🐘',
      mysql: '🐬',
      redis: '🔴',
    }
    return icons[engine] || '💾'
  }

  const getStatusColor = (status) => {
    return status === 'running' ? 'bg-green-500' : 'bg-gray-500'
  }

  const getDefaultPorts = () => {
    const ports = {
      mongo: 27017,
      postgres: 5432,
      mysql: 3306,
      redis: 6379,
    }
    return ports[createEngine] || ''
  }

  if (!dbEngine) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">
            Database Engine Not Available
          </h2>
          <p className="text-gray-400">Please check your Electron setup</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
            notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          } animate-slide-in`}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Download Progress */}
      {downloadProgress && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 bg-blue-600 rounded-lg shadow-lg flex items-center gap-3">
          <Download className="w-5 h-5 animate-bounce" />
          <span>{downloadProgress}</span>
        </div>
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Database className="w-10 h-10 text-blue-400" />
              Database Manager
            </h1>
            <p className="text-gray-400">
              Manage your local database instances
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-2 transition-colors font-semibold"
            >
              <Plus className="w-5 h-5" />
              New Instance
            </button>
          </div>
        </div>
      </div>

      {/* Binaries Status */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">
            Installed Binaries
          </h3>
          <div className="flex gap-6">
            {Object.entries(binaries).map(([engine, info]) => (
              <div key={engine} className="flex items-center gap-2">
                <span className="text-2xl">{getEngineIcon(engine)}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="capitalize font-medium">{engine}</span>
                    {info.installed ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                  {info.isSystem && (
                    <span className="text-xs text-blue-400">
                      System Install
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Instances Grid */}
      <div className="max-w-7xl mx-auto">
        {instances.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
            <Database className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              No database instances
            </h3>
            <p className="text-gray-400 mb-6">
              Create your first database instance to get started
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg inline-flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Instance
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {instances.map((instance) => (
              <div
                key={instance.id}
                className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-all"
              >
                {/* Instance Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">
                      {getEngineIcon(instance.engine)}
                    </span>
                    <div>
                      <h3 className="text-xl font-bold capitalize">
                        {instance.engine}
                      </h3>
                      <p className="text-sm text-gray-400">
                        Port {instance.port}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-3 h-3 rounded-full ${getStatusColor(instance.status)}`}
                  />
                </div>

                {/* Instance Info */}
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span
                      className={`font-semibold ${instance.status === 'running' ? 'text-green-400' : 'text-gray-400'}`}
                    >
                      {instance.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Version:</span>
                    <span>{instance.version}</span>
                  </div>
                  {instance.pid && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">PID:</span>
                      <span className="font-mono text-xs">{instance.pid}</span>
                    </div>
                  )}
                  {instance.username && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">User:</span>
                      <span className="font-mono text-xs">
                        {instance.username}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {instance.status === 'stopped' ? (
                    <button
                      onClick={() => handleStartInstance(instance.id)}
                      disabled={loading}
                      className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-500 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <Play className="w-4 h-4" />
                      Start
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStopInstance(instance.id)}
                      disabled={loading}
                      className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <Square className="w-4 h-4" />
                      Stop
                    </button>
                  )}
                  <button
                    onClick={() => handleShowConnectionInfo(instance.id)}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                    title="Connection Info"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteInstance(instance.id)}
                    disabled={loading || instance.status === 'running'}
                    className="px-3 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50"
                    title={
                      instance.status === 'running'
                        ? 'Stop instance first'
                        : 'Delete'
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Instance Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <h2 className="text-2xl font-bold mb-6">
              Create Database Instance
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Database Engine
                </label>
                <select
                  value={createEngine}
                  onChange={(e) => {
                    setCreateEngine(e.target.value)
                    setCreatePort('')
                  }}
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="mongo">🍃 MongoDB</option>
                  <option value="postgres">🐘 PostgreSQL</option>
                  <option value="mysql">🐬 MySQL</option>
                  <option value="redis">🔴 Redis</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Port (optional)
                </label>
                <input
                  type="number"
                  value={createPort}
                  onChange={(e) => setCreatePort(e.target.value)}
                  placeholder={`Default: ${getDefaultPorts()}`}
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Leave empty to use default port
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Version
                </label>
                <select
                  value={createVersion}
                  onChange={(e) => setCreateVersion(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="latest">Latest (Recommended)</option>
                  {createEngine === 'mongo' && (
                    <option value="6.0.6">6.0.6</option>
                  )}
                  {createEngine === 'postgres' && (
                    <>
                      <option value="18.0.0">18.0.0</option>
                      <option value="17.2.0">17.2.0</option>
                      <option value="16.6.0">16.6.0</option>
                    </>
                  )}
                  {createEngine === 'mysql' && (
                    <option value="8.1.0">8.1.0</option>
                  )}
                  {createEngine === 'redis' && (
                    <>
                      <option value="7.4.1">7.4.1</option>
                      <option value="7.2.0">7.2.0</option>
                      <option value="7.0.0">7.0.0</option>
                    </>
                  )}
                </select>
              </div>

              <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-3">
                <p className="text-xs text-blue-200">
                  <Info className="w-3 h-3 inline mr-1" />
                  Binary will be downloaded automatically if not installed
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateInstance}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50 font-semibold"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connection Info Modal */}
      {connectionInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Terminal className="w-6 h-6" />
                Connection Info
              </h2>
              <button
                onClick={() => setConnectionInfo(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-900 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">
                    Connection String
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(connectionInfo.connectionString)
                    }
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Copy className="w-4 h-4" />
                    <span className="text-xs">Copy</span>
                  </button>
                </div>
                <code className="text-sm text-green-400 break-all block">
                  {connectionInfo.connectionString}
                </code>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Host</div>
                  <div className="font-mono">{connectionInfo.host}</div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Port</div>
                  <div className="font-mono">{connectionInfo.port}</div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Username</div>
                  <div className="font-mono">
                    {connectionInfo.username || 'N/A'}
                  </div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Database</div>
                  <div className="font-mono">{connectionInfo.database}</div>
                </div>
              </div>

              {connectionInfo.password !== null && (
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-1">Password</div>
                  <div className="font-mono">
                    {connectionInfo.password || '(none - trust authentication)'}
                  </div>
                </div>
              )}

              {connectionInfo.note && (
                <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-4">
                  <div className="flex gap-2">
                    <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-200">
                      {connectionInfo.note}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
