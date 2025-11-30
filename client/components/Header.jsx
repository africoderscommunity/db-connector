import React, { useState } from 'react'
import { Database, Plus } from 'lucide-react'
import { useAppContext } from '../context/AppContext'

export default function Header({
  tabs = ['Connections', 'Visual Schema', 'Db Engine'],
  onTabChange,
}) {
  const { setShowAddForm, activeTab, setActiveTab } = useAppContext()

  const handleTabClick = (tab) => {
    setActiveTab(tab)
  }

  return (
    <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Database Connector</h1>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Tabs */}
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabClick(tab)}
                className={`px-4 py-2 rounded-lg transition text-sm font-medium ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* New Connection Button */}
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition text-white"
          >
            <Plus className="w-4 h-4" />
            New Connection
          </button>
        </div>
      </div>
    </div>
  )
}
