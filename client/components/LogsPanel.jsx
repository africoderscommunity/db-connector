import React, { useEffect, useRef } from 'react'
import { useAppContext } from '../context/AppContext'

export default function LogsPanel() {
  const { logs } = useAppContext()

  const logContainerRef = useRef(null)

  // Auto-scroll to bottom when logs change
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div
      ref={logContainerRef}
      className="h-full bg-gray-950 text-gray-300 p-3 font-mono text-sm overflow-auto border-t border-gray-800"
    >
      <h3 className="text-gray-400 text-xs mb-2 uppercase tracking-wide">
        Logs
      </h3>

      {logs && logs.length > 0 ? (
        logs.map((log, i) => (
          <div key={i} className="mb-1">
            <span
              className={
                log.type === 'error'
                  ? 'text-red-400'
                  : log.type === 'success'
                    ? 'text-green-400'
                    : 'text-gray-300'
              }
              dangerouslySetInnerHTML={{
                __html: `[${log.time}] ${log.message.replace(/\n/g, '<br/>')}`,
              }}
            />
          </div>
        ))
      ) : (
        <p className="text-gray-500 italic">No logs yet.</p>
      )}
    </div>
  )
}
