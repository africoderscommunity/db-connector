// import React from "react";
// import { Play, Database } from "lucide-react";
// import { useDatabase } from "../context/DatabaseContext";

// export default function QueryEditor() {
//   const {
//     loading,
//     setQueryText,
//     queryText,
//     activeConnection,
//     executeQuery
//   } = useDatabase();

//   const isMongo = activeConnection?.type === "mongodb";

//   return (
//     <div className="bg-gray-800 border-b border-gray-700 p-4 h-full flex flex-col">
//       <div className="mb-2 flex items-center justify-between">
//         <label className="text-sm font-semibold text-gray-400 flex items-center gap-2">
//           <Database className="w-4 h-4 text-gray-500" />
//           {isMongo ? "MongoDB Query" : "SQL Query"}
//         </label>

//         <button
//           onClick={() => executeQuery()}
//           disabled={loading}
//           className="flex items-center gap-2 px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
//         >
//           <Play className="w-3 h-3" />
//           {loading ? "Running..." : "Execute"}
//         </button>
//       </div>

//       <textarea
//         value={
//           queryText ||
//           (isMongo
//             ? `db.users.find({})`
//             : `SELECT * FROM users LIMIT 10;`)
//         }
//         onChange={(e) => setQueryText(e.target.value)}
//         placeholder={
//           isMongo
//             ? "db.collection.find({ status: 'active' })"
//             : "SELECT * FROM users WHERE id = 1;"
//         }
//         className="flex-1 bg-gray-900 border border-gray-700 rounded p-3 text-sm font-mono focus:outline-none focus:border-blue-500 resize-none"
//       />
//     </div>
//   );
// }
import React, { useEffect, useMemo } from "react";
import { Play, Database } from "lucide-react";
import { useDatabase } from "../context/DatabaseContext";
import CodeMirror from "@uiw/react-codemirror";
import { sql } from "@codemirror/lang-sql";
import { javascript } from "@codemirror/lang-javascript";
import { autocompletion, CompletionContext } from "@codemirror/autocomplete";

export default function QueryEditor() {
  const {
    loading,
    setQueryText,
    queryText,
    activeConnection,
    executeQuery,
    schemaMetadata,
    loadSchemaMetadata  
  } = useDatabase();
  useEffect(()=>{
    loadSchemaMetadata()
  },[])
console.log({schemaMetadata})
  const isMongo = activeConnection?.type === "mongodb";

  // Build autocomplete suggestions dynamically
  const completions = useMemo(
    () =>
      autocompletion({
        override: [
          (context) => {
            const word = context.matchBefore(/\w*/);
            if (!word || (word.from === word.to && !context.explicit)) return null;

            const schemaItems = [];
            if (schemaMetadata) {
              Object.entries(schemaMetadata).forEach(([table, cols]) => {
                schemaItems.push({
                  label: table,
                  type: "table",
                  info: `${cols.length} columns`,
                });
                cols.forEach((c) =>
                  schemaItems.push({
                    label: c,
                    type: "field",
                    info: `Column in ${table}`,
                  })
                );
              });
            }

            const baseKeywords = isMongo
              ? ["db.", "find", "insertOne", "updateOne", "aggregate", "deleteOne"]
              : ["SELECT", "FROM", "WHERE", "INSERT", "UPDATE", "DELETE", "JOIN", "LIMIT"];

            return {
              from: word.from,
              options: [
                ...baseKeywords.map((kw) => ({ label: kw, type: "keyword" })),
                ...schemaItems,
              ],
            };
          },
        ],
      }),
    [schemaMetadata, isMongo]
  );

  useEffect(() => {
    if (!queryText) {
      setQueryText(
        isMongo ? `db.users.find({})` : `SELECT * FROM users LIMIT 10;`
      );
    }
  }, [isMongo]);

  return (
    <div className="bg-gray-800 border-b border-gray-700 p-4 h-full flex flex-col">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-400 flex items-center gap-2">
          <Database className="w-4 h-4 text-gray-500" />
          {isMongo ? "MongoDB Query" : "SQL Query"}
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

      {/* CodeMirror Editor */}
      <div className="flex-1 overflow-hidden rounded border border-gray-700">
        <CodeMirror
          value={queryText}
          height="100%"
          theme="dark"
          extensions={[
            isMongo ? javascript() : sql(),
            completions,
          ]}
          onChange={(value) => {
            
            console.log({value})
            setQueryText(value)
          }
          }
          placeholder={
            isMongo
              ? "db.collection.find({ status: 'active' })"
              : "SELECT * FROM users WHERE id = 1;"
          }
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
  );
}
