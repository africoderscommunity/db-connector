import React, { useEffect, useMemo } from 'react'
import { Play, Database } from 'lucide-react'
import { useDatabase } from '../context/DatabaseContext'
import CodeMirror from '@uiw/react-codemirror'
import { sql } from '@codemirror/lang-sql'
import { javascript } from '@codemirror/lang-javascript'
import { autocompletion, CompletionContext } from '@codemirror/autocomplete'

export default function QueryEditor() {
  const {
    loading,
    setQueryText,
    queryText,
    activeConnection,
    executeQuery,
    schemaMetadata,
    loadSchemaMetadata,
  } = useDatabase()

  useEffect(() => {
    loadSchemaMetadata()
  }, [])

  console.log({ schemaMetadata })

  const isMongo = activeConnection?.type === 'mongodb'
  const isRedis = activeConnection?.type === 'redis'

  // Build autocomplete suggestions dynamically
  const completions = useMemo(
    () =>
      autocompletion({
        override: [
          (context) => {
            const word = context.matchBefore(/\w*/)
            if (!word || (word.from === word.to && !context.explicit))
              return null

            const schemaItems = []
            if (schemaMetadata) {
              Object.entries(schemaMetadata).forEach(([table, cols]) => {
                schemaItems.push({
                  label: table,
                  type: 'table',
                  info: `${cols.length} columns`,
                })
                cols.forEach((c) =>
                  schemaItems.push({
                    label: c,
                    type: 'field',
                    info: `Column in ${table}`,
                  })
                )
              })
            }

            let baseKeywords = []

            if (isRedis) {
              // Redis commands
              baseKeywords = [
                // String commands
                'GET',
                'SET',
                'DEL',
                'INCR',
                'DECR',
                'APPEND',
                'STRLEN',
                // Hash commands
                'HGET',
                'HSET',
                'HGETALL',
                'HDEL',
                'HEXISTS',
                'HKEYS',
                'HVALS',
                // List commands
                'LPUSH',
                'RPUSH',
                'LPOP',
                'RPOP',
                'LRANGE',
                'LLEN',
                'LINDEX',
                // Set commands
                'SADD',
                'SREM',
                'SMEMBERS',
                'SISMEMBER',
                'SCARD',
                // Sorted Set commands
                'ZADD',
                'ZREM',
                'ZRANGE',
                'ZRANK',
                'ZSCORE',
                // Key commands
                'KEYS',
                'EXISTS',
                'TYPE',
                'TTL',
                'EXPIRE',
                'PERSIST',
                // Server commands
                'PING',
                'INFO',
                'DBSIZE',
                'FLUSHDB',
                'FLUSHALL',
              ]
            } else if (isMongo) {
              baseKeywords = [
                'db.',
                'find',
                'findOne',
                'insertOne',
                'insertMany',
                'updateOne',
                'updateMany',
                'deleteOne',
                'deleteMany',
                'aggregate',
                'countDocuments',
                'distinct',
                'createCollection',
              ]
            } else {
              baseKeywords = [
                'SELECT',
                'FROM',
                'WHERE',
                'INSERT',
                'UPDATE',
                'DELETE',
                'JOIN',
                'LIMIT',
                'ORDER BY',
                'GROUP BY',
                'HAVING',
              ]
            }

            return {
              from: word.from,
              options: [
                ...baseKeywords.map((kw) => ({ label: kw, type: 'keyword' })),
                ...schemaItems,
              ],
            }
          },
        ],
      }),
    [schemaMetadata, isMongo, isRedis]
  )

  useEffect(() => {
    if (!queryText) {
      if (isRedis) {
        setQueryText(`GET mykey`)
      } else if (isMongo) {
        setQueryText(`db.users.find({})`)
      } else {
        setQueryText(`SELECT * FROM users LIMIT 10;`)
      }
    }
  }, [isMongo, isRedis])

  // Determine editor language
  const getEditorLanguage = () => {
    if (isRedis) return javascript() // Redis commands are simple text, use JS for syntax
    if (isMongo) return javascript()
    return sql()
  }

  // Get editor label
  const getEditorLabel = () => {
    if (isRedis) return 'Redis Command'
    if (isMongo) return 'MongoDB Query'
    return 'SQL Query'
  }

  // Get placeholder text
  const getPlaceholder = () => {
    if (isRedis) return 'GET user:123 or HGETALL session:abc'
    if (isMongo) return "db.collection.find({ status: 'active' })"
    return 'SELECT * FROM users WHERE id = 1;'
  }

  return (
    <div className="bg-gray-800 border-b border-gray-700 p-4 h-full flex flex-col">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-400 flex items-center gap-2">
          <Database className="w-4 h-4 text-gray-500" />
          {getEditorLabel()}
        </label>

        <button
          onClick={() => executeQuery()}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <Play className="w-3 h-3" />
          {loading ? 'Running...' : 'Execute'}
        </button>
      </div>

      {/* CodeMirror Editor */}
      <div className="flex-1 overflow-hidden rounded border border-gray-700">
        <CodeMirror
          value={queryText}
          height="100%"
          theme="dark"
          extensions={[getEditorLanguage(), completions]}
          onChange={(value) => {
            console.log({ value })
            setQueryText(value)
          }}
          placeholder={getPlaceholder()}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLine: true,
            autocompletion: true,
            foldGutter: true,
            indentOnInput: true,
          }}
        />
      </div>
    </div>
  )
}
