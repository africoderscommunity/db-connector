// // import React, { useMemo, useState, useEffect } from "react";
// // import { Database, GitBranch, LayoutGrid } from "lucide-react";
// // import ReactFlow, {
// //   MiniMap,
// //   Controls,
// //   Background,
// //   useNodesState,
// //   useEdgesState,
// // } from "reactflow";
// // import dagre from "dagre";
// // import "reactflow/dist/style.css";
// // import { useAppContext as useApp } from "../context/AppContext";
// // import { useDatabase } from "../context/DatabaseContext";

// // const nodeWidth = 180;
// // const nodeHeight = 80;

// // export default function VisualSchemaExplorer() {
// //   const { connectionStatus } = useApp();
// //   const { activeConnection } = useDatabase();
// //   const [viewMode, setViewMode] = useState("diagram");
// //   const [nodes, setNodes, onNodesChange] = useNodesState([]);
// //   const [edges, setEdges, onEdgesChange] = useEdgesState([]);

// //   if (!activeConnection)
// //     return <p className="p-4 text-gray-400">No active connection</p>;

// //   const primaryUniqueKey =
// //     connectionStatus[connectionStatus.currentActiveDatabase]?.primaryUniqueKey ||
// //     [];

// //   // Group by DB + Table
// //   const groupedData = useMemo(() => {
// //     return primaryUniqueKey.reduce((acc, item) => {
// //       if (!acc[item.DatabaseName]) acc[item.DatabaseName] = {};
// //       if (!acc[item.DatabaseName][item.TableName])
// //         acc[item.DatabaseName][item.TableName] = [];

// //       acc[item.DatabaseName][item.TableName].push({
// //         name: item.ColumnName,
// //         keyType: item.KeyType,
// //         fkTable: item.ReferencedTable || null,
// //         fkColumn: item.ReferencedColumn || null,
// //       });
// //       return acc;
// //     }, {});
// //   }, [primaryUniqueKey]);

// //   // 🔷 Auto-layout with Dagre
// //   useEffect(() => {
// //     const g = new dagre.graphlib.Graph();
// //     g.setGraph({ rankdir: "TB", ranksep: 100, nodesep: 80 });
// //     g.setDefaultEdgeLabel(() => ({}));

// //     const localNodes = [];
// //     const localEdges = [];

// //     Object.entries(groupedData).forEach(([db, tables]) => {
// //       Object.keys(tables).forEach((tableName) => {
// //         const id = `${db}.${tableName}`;
// //         g.setNode(id, { width: nodeWidth, height: nodeHeight });
// //         localNodes.push({
// //           id,
// //           data: {
// //             label: (
// //               <div className="p-2 bg-gray-800 text-gray-100 rounded-lg shadow-md">
// //                 <div className="font-semibold text-green-400">{tableName}</div>
// //                 <div className="text-xs text-gray-400">
// //                   {tables[tableName].length} cols
// //                 </div>
// //               </div>
// //             ),
// //           },
// //           position: { x: 0, y: 0 },
// //           style: { borderRadius: 12, border: "1px solid #333" },
// //         });

// //         tables[tableName].forEach((col) => {
// //           if (col.fkTable) {
// //             localEdges.push({
// //               id: `${tableName}-${col.name}->${col.fkTable}`,
// //               source: id,
// //               target: `${db}.${col.fkTable}`,
// //               label: `${col.name} → ${col.fkColumn}`,
// //               animated: true,
// //               style: { stroke: "#00ff99", strokeWidth: 1.5 },
// //               labelStyle: { fill: "#ccc", fontSize: 10 },
// //             });
// //           }
// //         });
// //       });
// //     });

// //     localEdges.forEach((e) => g.setEdge(e.source, e.target));

// //     dagre.layout(g);
// //     const laidOutNodes = localNodes.map((n) => {
// //       const pos = g.node(n.id);
// //       return {
// //         ...n,
// //         position: { x: pos.x - nodeWidth / 2, y: pos.y - nodeHeight / 2 },
// //       };
// //     });

// //     setNodes(laidOutNodes);
// //     setEdges(localEdges);
// //   }, [groupedData]);

// //   return (
// //     <div className="p-6 bg-gray-900 h-full overflow-auto space-y-4">
// //       <div className="flex justify-between items-center">
// //         <h2 className="text-xl font-semibold text-white flex items-center gap-2">
// //           <GitBranch className="text-green-400" />
// //           Visual Schema Explorer (Hierarchical)
// //         </h2>

// //         <button
// //           onClick={() =>
// //             setViewMode(viewMode === "list" ? "diagram" : "list")
// //           }
// //           className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
// //         >
// //           <LayoutGrid size={16} />
// //           {viewMode === "list" ? "Diagram View" : "List View"}
// //         </button>
// //       </div>

// //       {viewMode === "diagram" ? (
// //         <div className="h-[80vh] bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
// //           <ReactFlow
// //             nodes={nodes}
// //             edges={edges}
// //             fitView
// //             onNodesChange={onNodesChange}
// //             onEdgesChange={onEdgesChange}
// //             defaultEdgeOptions={{
// //               type: "smoothstep",
// //               style: { strokeWidth: 1.5 },
// //             }}
// //           >
// //             <MiniMap />
// //             <Controls />
// //             <Background color="#333" gap={16} />
// //           </ReactFlow>
// //         </div>
// //       ) : (
// //         <div className="text-gray-300 p-4">List view coming soon…</div>
// //       )}
// //     </div>
// //   );
// // }

// import React, { useState, useMemo } from "react";
// import {
//   Database,
//   Table,
//   ArrowRight,
//   GitBranch,
//   LayoutGrid,
//   Hash,
// } from "lucide-react";
// import { useAppContext as useApp } from "../context/AppContext";
// import { useDatabase } from "../context/DatabaseContext";
// import ReactFlow, { MiniMap, Controls, Background } from "reactflow";
// import "reactflow/dist/style.css";

// export default function VisualSchemaExplorer() {
//   const { connectionStatus } = useApp();
//   const { activeConnection } = useDatabase();

//   const [expandedTables, setExpandedTables] = useState({});
//   const [viewMode, setViewMode] = useState("list"); // "list" | "diagram"

//   if (!activeConnection)
//     return <p className="p-4 text-gray-400">No active connection</p>;

//   const primaryUniqueKey =
//     connectionStatus[connectionStatus.currentActiveDatabase]?.primaryUniqueKey ||
//     [];

//   // 🧩 Group columns by DB & table (include FK + INDEX info)
//   const groupedData = primaryUniqueKey.reduce((acc, item) => {
//     if (!acc[item.DatabaseName]) acc[item.DatabaseName] = {};
//     if (!acc[item.DatabaseName][item.TableName])
//       acc[item.DatabaseName][item.TableName] = { columns: [], indexes: [] };

//     // Push column info
//     acc[item.DatabaseName][item.TableName].columns.push({
//       name: item.ColumnName,
//       keyType: item.KeyType,
//       fkTable: item.ReferencedTable || null,
//       fkColumn: item.ReferencedColumn || null,
//     });

//     // If this item is part of an index, add it
//     if (item.KeyType === "INDEX" || item.KeyType === "UNIQUE") {
//       acc[item.DatabaseName][item.TableName].indexes.push({
//         indexName: item.IndexName || `${item.TableName}_${item.ColumnName}_idx`,
//         columns: [item.ColumnName],
//         type: item.KeyType,
//       });
//     }

//     return acc;
//   }, {});

//   const toggleTable = (db, table) => {
//     setExpandedTables((prev) => ({
//       ...prev,
//       [`${db}.${table}`]: !prev[`${db}.${table}`],
//     }));
//   };

//   const keyBadge = (col) => {
//     let bg = "bg-gray-600 text-gray-100";
//     let label = col.keyType;

//     if (col.keyType === "PRIMARY") bg = "bg-yellow-300 text-gray-900";
//     if (col.keyType === "UNIQUE") bg = "bg-blue-400 text-white";
//     if (col.keyType === "INDEX") bg = "bg-purple-400 text-white";

//     return (
//       <span
//         className={`px-2 py-0.5 rounded-full text-xs font-semibold ${bg}`}
//         title={`Key: ${col.keyType}`}
//       >
//         {label}
//       </span>
//     );
//   };

//   // 🧭 Build diagram nodes & edges
//   const diagramData = useMemo(() => {
//     const nodes = [];
//     const edges = [];
//     let x = 0,
//       y = 0;

//     Object.entries(groupedData).forEach(([db, tables]) => {
//       Object.keys(tables).forEach((tableName, i) => {
//         const table = tables[tableName];
//         const id = `${db}.${tableName}`;
//         nodes.push({
//           id,
//           data: {
//             label: (
//               <div className="p-2 bg-gray-800 text-gray-100 rounded-lg shadow-md w-44">
//                 <div className="font-semibold text-green-400 mb-1">
//                   {tableName}
//                 </div>
//                 <div className="text-xs text-gray-400">
//                   {table.columns.length} columns
//                 </div>
//                 {table.indexes.length > 0 && (
//                   <div className="text-[10px] text-purple-300 mt-1">
//                     {table.indexes.map((idx) => (
//                       <div key={idx.indexName}>
//                         <Hash className="inline w-3 h-3 mr-1" />
//                         {idx.indexName} ({idx.columns.join(", ")})
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>
//             ),
//           },
//           position: { x: (i % 4) * 250 + x, y: Math.floor(i / 4) * 200 + y },
//           style: { borderRadius: 12, border: "1px solid #333" },
//         });

//         // FK edges
//         table.columns.forEach((col) => {
//           if (col.fkTable) {
//             edges.push({
//               id: `${tableName}-${col.name}->${col.fkTable}`,
//               source: id,
//               target: `${db}.${col.fkTable}`,
//               label: `${col.name} → ${col.fkColumn}`,
//               animated: true,
//               style: { stroke: "#00ff99" },
//               labelStyle: { fill: "#ccc", fontSize: 10 },
//             });
//           }
//         });

//         // INDEX edges (dashed)
//         table.indexes.forEach((idx) => {
//           idx.columns.forEach((col) => {
//             edges.push({
//               id: `${tableName}-${col}-index`,
//               source: id,
//               target: id,
//               label: `${idx.indexName}`,
//               type: "smoothstep",
//               animated: false,
//               style: { stroke: "#a855f7", strokeDasharray: "4 2" },
//               labelStyle: { fill: "#a855f7", fontSize: 9 },
//             });
//           });
//         });
//       });
//     });

//     return { nodes, edges };
//   }, [groupedData]);

//   return (
//     <div className="p-6 bg-gray-900 h-full overflow-auto space-y-6">
//       {/* Toolbar */}
//       <div className="flex justify-between items-center mb-4">
//         <h2 className="text-xl font-semibold text-white flex items-center gap-2">
//           <GitBranch className="text-green-400" />
//           Visual Schema Explorer
//         </h2>

//         <button
//           onClick={() => setViewMode(viewMode === "list" ? "diagram" : "list")}
//           className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
//         >
//           <LayoutGrid size={16} />
//           {viewMode === "list" ? "Diagram View" : "List View"}
//         </button>
//       </div>

//       {viewMode === "list" ? (
//         // 🧾 List View
//         Object.keys(groupedData).map((db) => (
//           <div key={db} className="space-y-4">
//             <div className="flex items-center gap-2 text-2xl font-bold text-blue-400 mb-2">
//               <Database className="w-6 h-6" />
//               {db}
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//               {Object.keys(groupedData[db]).map((table) => {
//                 const tbl = groupedData[db][table];
//                 return (
//                   <div
//                     key={table}
//                     className="bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-shadow overflow-hidden"
//                   >
//                     <div
//                       className="flex justify-between items-center cursor-pointer p-4 bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-600 hover:to-gray-800"
//                       onClick={() => toggleTable(db, table)}
//                     >
//                       <div className="flex items-center gap-2">
//                         <Table className="w-5 h-5 text-green-400" />
//                         <span className="font-semibold text-lg text-green-400">
//                           {table}
//                         </span>
//                       </div>
//                       <span className="text-gray-400">
//                         {expandedTables[`${db}.${table}`] ? "▼" : "▶"}
//                       </span>
//                     </div>

//                     {expandedTables[`${db}.${table}`] && (
//                       <div className="p-4 space-y-3 border-t border-gray-700">
//                         {/* Columns */}
//                         {tbl.columns.map((col, i) => (
//                           <div
//                             key={i}
//                             className="flex justify-between items-center p-2 rounded hover:bg-gray-700 transition-colors"
//                           >
//                             <div className="flex flex-col">
//                               <span className="font-mono text-sm text-gray-200">
//                                 {col.name}
//                               </span>
//                               {col.fkTable && (
//                                 <div className="flex items-center gap-1 text-xs text-red-400">
//                                   <ArrowRight className="w-3 h-3" />
//                                   {col.fkTable}.{col.fkColumn}
//                                 </div>
//                               )}
//                             </div>
//                             {keyBadge(col)}
//                           </div>
//                         ))}

//                         {/* Indexes */}
//                         {tbl.indexes.length > 0 && (
//                           <div className="pt-2 border-t border-gray-700 text-xs text-purple-300 space-y-1">
//                             <div className="flex items-center gap-1 font-semibold">
//                               <Hash className="w-3 h-3" />
//                               Indexes
//                             </div>
//                             {tbl.indexes.map((idx) => (
//                               <div key={idx.indexName}>
//                                 {idx.indexName}: {idx.columns.join(", ")}
//                               </div>
//                             ))}
//                           </div>
//                         )}
//                       </div>
//                     )}
//                   </div>
//                 );
//               })}
//             </div>
//           </div>
//         ))
//       ) : (
//         // 🌐 Diagram View
//         <div className="h-[75vh] bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
//           <ReactFlow
//             nodes={diagramData.nodes}
//             edges={diagramData.edges}
//             fitView
//             defaultEdgeOptions={{
//               type: "smoothstep",
//               style: { strokeWidth: 1.5 },
//             }}
//           >
//             <MiniMap />
//             <Controls />
//             <Background color="#333" gap={16} />
//           </ReactFlow>
//         </div>
//       )}
//     </div>
//   );
// }
