import React, { useEffect, useMemo } from "react"
import { Play, Database } from "lucide-react"
import CodeMirror from "@uiw/react-codemirror"
import { useDatabase } from "../../context/DatabaseContext"

import CompletionProvider from "./CompletionProvider"
import useQueryDefaults from "../../hooks/useQueryDefaults"

import {
  getEditorLanguage,
  getEditorLabel,
  getPlaceholder,
} from "../../utils/editorHelpers"

export default function QueryEditor() {
  const {
    loading,
    queryText,
    setQueryText,
    activeConnection,
    executeQuery,
    schemaMetadata,
    loadSchemaMetadata,
  } = useDatabase()

  const type = activeConnection?.type

  useEffect(() => {
    loadSchemaMetadata()
  }, [])

  useQueryDefaults({ queryText, type, setQueryText })

  const completions = useMemo(
    () => CompletionProvider(schemaMetadata, type),
    [schemaMetadata, type]
  )

  return (
    <div className="bg-gray-800 border-b border-gray-700 p-4 h-full flex flex-col">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-400 flex items-center gap-2">
          <Database className="w-4 h-4 text-gray-500" />
          {getEditorLabel(type)}
        </label>

        <button
          onClick={() => executeQuery()}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <Play className="w-3 h-3" />
          {loading ? "Running..." : "Execute"}
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden rounded border border-gray-700">
        <CodeMirror
          value={queryText}
          height="100%"
          theme="dark"
          extensions={[getEditorLanguage(type), completions]}
          placeholder={getPlaceholder(type)}
          onChange={(value) => setQueryText(value)}
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
