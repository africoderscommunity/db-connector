// import React, { useState } from "react";
// import { Database, Table, ArrowRight } from "lucide-react";
// import { useAppContext as useApp } from "../context/AppContext";
// import { useDatabase } from "../context/DatabaseContext";

// export default function VisualSchemaExplorer() {
//   const { connectionStatus } = useApp();
//   const { activeConnection } = useDatabase();

//   if (!activeConnection)
//     return <p className="p-4 text-gray-400">No active connection</p>;

//   const primaryUniqueKey =
//     connectionStatus[connectionStatus.currentActiveDatabase]?.primaryUniqueKey ||
//     [];

//   // Group columns by database and table, include FK info
//   const groupedData = primaryUniqueKey.reduce((acc, item) => {
//     if (!acc[item.DatabaseName]) acc[item.DatabaseName] = {};
//     if (!acc[item.DatabaseName][item.TableName])
//       acc[item.DatabaseName][item.TableName] = [];

//     acc[item.DatabaseName][item.TableName].push({
//       name: item.ColumnName,
//       keyType: item.KeyType,
//       fkTable: item.ReferencedTable || null,
//       fkColumn: item.ReferencedColumn || null,
//     });

//     return acc;
//   }, {});

//   const [expandedTables, setExpandedTables] = useState({});

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

//     return (
//       <span
//         className={`px-2 py-0.5 rounded-full text-xs font-semibold ${bg}`}
//         title={`Key: ${col.keyType}`}
//       >
//         {label}
//       </span>
//     );
//   };

//   return (
//     <div className="p-6 bg-gray-900 h-full overflow-auto space-y-6">
//       {Object.keys(groupedData).map((db) => (
//         <div key={db} className="space-y-4">
//           {/* Database Header */}
//           <div className="flex items-center gap-2 text-2xl font-bold text-blue-400 mb-2">
//             <Database className="w-6 h-6" />
//             {db}
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//             {Object.keys(groupedData[db]).map((table) => (
//               <div
//                 key={table}
//                 className="bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-shadow overflow-hidden"
//               >
//                 {/* Table Header */}
//                 <div
//                   className="flex justify-between items-center cursor-pointer p-4 bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-600 hover:to-gray-800"
//                   onClick={() => toggleTable(db, table)}
//                 >
//                   <div className="flex items-center gap-2">
//                     <Table className="w-5 h-5 text-green-400" />
//                     <span className="font-semibold text-lg text-green-400">
//                       {table}
//                     </span>
//                   </div>
//                   <span className="text-gray-400">
//                     {expandedTables[`${db}.${table}`] ? "▼" : "▶"}
//                   </span>
//                 </div>

//                 {/* Columns Panel */}
//                 {expandedTables[`${db}.${table}`] && (
//                   <div className="p-4 space-y-2 border-t border-gray-700">
//                     {groupedData[db][table].map((col) => (
//                       <div
//                         key={col.name}
//                         className="flex justify-between items-center p-2 rounded hover:bg-gray-700 transition-colors"
//                       >
//                         <div className="flex flex-col">
//                           <span className="font-mono text-sm text-gray-200">
//                             {col.name}
//                           </span>
//                           {col.fkTable && col.fkColumn && (
//                             <div className="flex items-center gap-1 text-xs text-red-400">
//                               <ArrowRight className="w-3 h-3" />
//                               {col.fkTable}.{col.fkColumn}
//                             </div>
//                           )}
//                         </div>
//                         {keyBadge(col)}
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }


// // // import React, { useState, useEffect, useRef } from "react";
// // // import { Database, ZoomIn, ZoomOut } from "lucide-react";
// // // import { useAppContext as useApp } from "../context/AppContext";
// // // import { useDatabase } from "../context/DatabaseContext";

// // // export default function VisualSchemaExplorer() {
// // //   const { connectionStatus } = useApp();
// // //   const { activeConnection } = useDatabase();
  
// // //   const [scale, setScale] = useState(1);
// // //   const [position, setPosition] = useState({ x: 0, y: 0 });
// // //   const [isDragging, setIsDragging] = useState(false);
// // //   const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
// // //   const [connections, setConnections] = useState([]);
// // //   const canvasRef = useRef(null);
// // //   const tableRefs = useRef({});

// // //   if (!activeConnection)
// // //     return <p className="p-4 text-gray-400">No active connection</p>;

// // //   const primaryUniqueKey =
// // //     connectionStatus[connectionStatus.currentActiveDatabase]?.primaryUniqueKey ||
// // //     [];

// // //   // Process data into tables structure - note: your data has TableName not DatabaseName
// // //   const groupedData = React.useMemo(() => {
// // //     return primaryUniqueKey.reduce((acc, item) => {
// // //       // Since your data doesn't have DatabaseName, we'll use a default or the current database
// // //       const dbName = item.DatabaseName || connectionStatus.currentActiveDatabase || "Database";
      
// // //       if (!acc[dbName]) acc[dbName] = {};
// // //       if (!acc[dbName][item.TableName])
// // //         acc[dbName][item.TableName] = [];

// // //       acc[dbName][item.TableName].push({
// // //         name: item.ColumnName,
// // //         keyType: item.KeyType,
// // //         fkTable: item.ReferencedTable || null,
// // //         fkColumn: item.ReferencedColumn || null,
// // //       });

// // //       return acc;
// // //     }, {});
// // //   }, [primaryUniqueKey, connectionStatus.currentActiveDatabase]);

// // //   // Calculate connections between tables
// // //   useEffect(() => {
// // //     const newConnections = [];
    
// // //     Object.keys(groupedData).forEach(db => {
// // //       Object.keys(groupedData[db]).forEach(table => {
// // //         groupedData[db][table].forEach(col => {
// // //           if (col.fkTable && col.fkColumn) {
// // //             newConnections.push({
// // //               from: `${db}.${table}`,
// // //               to: `${db}.${col.fkTable}`,
// // //               fromCol: col.name,
// // //               toCol: col.fkColumn
// // //             });
// // //           }
// // //         });
// // //       });
// // //     });
    
// // //     setConnections(newConnections);
// // //   }, [groupedData]);

// // //   // Draw connections on canvas
// // //   useEffect(() => {
// // //     const canvas = canvasRef.current;
// // //     if (!canvas) return;

// // //     const ctx = canvas.getContext('2d');
// // //     const rect = canvas.getBoundingClientRect();
    
// // //     // Set canvas size with device pixel ratio for sharp lines
// // //     const dpr = window.devicePixelRatio || 1;
// // //     canvas.width = rect.width * dpr;
// // //     canvas.height = rect.height * dpr;
// // //     canvas.style.width = rect.width + 'px';
// // //     canvas.style.height = rect.height + 'px';
// // //     ctx.scale(dpr, dpr);

// // //     // Clear canvas
// // //     ctx.clearRect(0, 0, canvas.width, canvas.height);

// // //     // Draw connections
// // //     connections.forEach(conn => {
// // //       const fromEl = tableRefs.current[conn.from];
// // //       const toEl = tableRefs.current[conn.to];

// // //       if (fromEl && toEl) {
// // //         const fromRect = fromEl.getBoundingClientRect();
// // //         const toRect = toEl.getBoundingClientRect();
// // //         const canvasRect = canvas.getBoundingClientRect();

// // //         // Calculate connection points from right edge of source to left edge of target
// // //         const fromX = fromRect.right - canvasRect.left;
// // //         const fromY = fromRect.top + fromRect.height / 2 - canvasRect.top;
// // //         const toX = toRect.left - canvasRect.left;
// // //         const toY = toRect.top + toRect.height / 2 - canvasRect.top;

// // //         // Draw curved line with gradient
// // //         const gradient = ctx.createLinearGradient(fromX, fromY, toX, toY);
// // //         gradient.addColorStop(0, '#ef4444'); // red-500
// // //         gradient.addColorStop(1, '#60a5fa'); // blue-400
        
// // //         ctx.strokeStyle = gradient;
// // //         ctx.lineWidth = 2;
// // //         ctx.shadowColor = 'rgba(96, 165, 250, 0.5)';
// // //         ctx.shadowBlur = 4;
        
// // //         ctx.beginPath();
// // //         ctx.moveTo(fromX, fromY);
        
// // //         // Create smooth curve
// // //         const midX = (fromX + toX) / 2;
// // //         const offset = Math.abs(toX - fromX) * 0.3;
// // //         ctx.bezierCurveTo(
// // //           fromX + offset, fromY,
// // //           toX - offset, toY,
// // //           toX, toY
// // //         );
// // //         ctx.stroke();

// // //         // Reset shadow for arrow
// // //         ctx.shadowBlur = 0;

// // //         // Draw arrow at the end
// // //         const angle = Math.atan2(toY - fromY, toX - fromX);
// // //         const arrowLength = 10;
// // //         ctx.fillStyle = '#60a5fa';
// // //         ctx.beginPath();
// // //         ctx.moveTo(toX, toY);
// // //         ctx.lineTo(
// // //           toX - arrowLength * Math.cos(angle - Math.PI / 6),
// // //           toY - arrowLength * Math.sin(angle - Math.PI / 6)
// // //         );
// // //         ctx.lineTo(
// // //           toX - arrowLength * Math.cos(angle + Math.PI / 6),
// // //           toY - arrowLength * Math.sin(angle + Math.PI / 6)
// // //         );
// // //         ctx.closePath();
// // //         ctx.fill();

// // //         // Draw connection label in the middle
// // //         const labelX = (fromX + toX) / 2;
// // //         const labelY = (fromY + toY) / 2 - 8;
// // //         ctx.fillStyle = '#1f2937'; // gray-800
// // //         ctx.fillRect(labelX - 20, labelY - 8, 40, 16);
// // //         ctx.strokeStyle = '#60a5fa';
// // //         ctx.lineWidth = 1;
// // //         ctx.strokeRect(labelX - 20, labelY - 8, 40, 16);
// // //         ctx.fillStyle = '#60a5fa';
// // //         ctx.font = '10px monospace';
// // //         ctx.textAlign = 'center';
// // //         ctx.fillText('FK', labelX, labelY + 4);
// // //       }
// // //     });
// // //   }, [connections, scale, position]);

// // //   const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 2));
// // //   const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.5));

// // //   const handleMouseDown = (e) => {
// // //     if (e.target.closest('.table-card')) return;
// // //     setIsDragging(true);
// // //     setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
// // //   };

// // //   const handleMouseMove = (e) => {
// // //     if (!isDragging) return;
// // //     setPosition({
// // //       x: e.clientX - dragStart.x,
// // //       y: e.clientY - dragStart.y
// // //     });
// // //   };

// // //   const handleMouseUp = () => setIsDragging(false);

// // //   const keyBadge = (col) => {
// // //     if (!col.keyType) return null;
    
// // //     let bg = "bg-gray-600 text-gray-100";
// // //     let label = col.keyType;

// // //     if (col.keyType === "PRIMARY") {
// // //       bg = "bg-yellow-300 text-gray-900";
// // //       label = "PK";
// // //     }
// // //     if (col.keyType === "UNIQUE") {
// // //       bg = "bg-blue-400 text-white";
// // //       label = "UQ";
// // //     }
// // //     if (col.keyType === "INDEX") {
// // //       bg = "bg-purple-400 text-white";
// // //       label = "IDX";
// // //     }
// // //     // Check if it's a foreign key by checking if it has a referenced table
// // //     if (col.fkTable && col.fkColumn) {
// // //       bg = "bg-red-400 text-white";
// // //       label = "FK";
// // //     }

// // //     return (
// // //       <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${bg}`}>
// // //         {label}
// // //       </span>
// // //     );
// // //   };

// // //   return (
// // //     <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
// // //       {/* Controls */}
// // //       <div className="absolute top-4 right-4 z-20 flex gap-2">
// // //         <button
// // //           onClick={handleZoomIn}
// // //           className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white"
// // //         >
// // //           <ZoomIn className="w-5 h-5" />
// // //         </button>
// // //         <button
// // //           onClick={handleZoomOut}
// // //           className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white"
// // //         >
// // //           <ZoomOut className="w-5 h-5" />
// // //         </button>
// // //       </div>

// // //       {/* Canvas for connections */}
// // //       <canvas
// // //         ref={canvasRef}
// // //         className="absolute inset-0 pointer-events-none z-0"
// // //       />

// // //       {/* Diagram container */}
// // //       <div
// // //         className="absolute inset-0 cursor-grab active:cursor-grabbing"
// // //         onMouseDown={handleMouseDown}
// // //         onMouseMove={handleMouseMove}
// // //         onMouseUp={handleMouseUp}
// // //         onMouseLeave={handleMouseUp}
// // //       >
// // //         <div
// // //           style={{
// // //             transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
// // //             transformOrigin: 'center center',
// // //           }}
// // //           className="relative p-8 transition-transform"
// // //         >
// // //           {Object.keys(groupedData).map((db,i) => (
// // //             <div key={i} className="mb-8">
// // //               {/* Database Header */}
// // //               <div className="flex items-center gap-2 text-xl font-bold text-blue-400 mb-4">
// // //                 <Database className="w-5 h-5" />
// // //                 {db}
// // //               </div>

// // //               {/* Tables in a grid */}
// // //               <div className="flex flex-wrap gap-6">
// // //                 {Object.keys(groupedData[db]).map((table, i) => (
// // //                   <div
// // //                     key={i}
// // //                     ref={el => tableRefs.current[`${db}.${table}`] = el}
// // //                     className="table-card bg-gray-800 rounded-lg shadow-xl border-2 border-gray-700 hover:border-blue-500 transition-all min-w-[250px]"
// // //                   >
// // //                     {/* Table Header */}
// // //                     <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-3 rounded-t-lg">
// // //                       <span className="font-bold text-white text-lg">
// // //                         {table}
// // //                       </span>
// // //                     </div>

// // //                     {/* Columns */}
// // //                     <div className="p-3 space-y-1">
// // //                       {groupedData[db][table].map((col,i) => (
// // //                         <div
// // //                           key={i}
// // //                           className="flex flex-col p-2 rounded hover:bg-gray-700 transition-colors"
// // //                         >
// // //                           <div className="flex items-center justify-between">
// // //                             <div className="flex items-center gap-2">
// // //                               {keyBadge(col)}
// // //                               <span className="font-mono text-sm text-gray-200">
// // //                                 {col.name}
// // //                               </span>
// // //                             </div>
// // //                           </div>
// // //                           {col.fkTable && col.fkColumn && (
// // //                             <div className="ml-6 mt-1 text-xs text-red-300 flex items-center gap-1">
// // //                               <span>→</span>
// // //                               <span className="font-mono">{col.fkTable}.{col.fkColumn}</span>
// // //                             </div>
// // //                           )}
// // //                         </div>
// // //                       ))}
// // //                     </div>
// // //                   </div>
// // //                 ))}
// // //               </div>
// // //             </div>
// // //           ))}
// // //         </div>
// // //       </div>

// // //       {/* Instructions */}
// // //       <div className="absolute bottom-4 left-4 bg-gray-800 p-3 rounded-lg text-gray-300 text-sm z-20">
// // //         <p>🖱️ Click and drag to pan</p>
// // //         <p>🔍 Use zoom controls to zoom in/out</p>
// // //       </div>
// // //     </div>
// // //   );
// // // }

// // import React, { useState, useMemo } from "react";
// // import { Database, Table, ArrowRight, GitBranch, LayoutGrid } from "lucide-react";
// // import { useAppContext as useApp } from "../context/AppContext";
// // import { useDatabase } from "../context/DatabaseContext";
// // import ReactFlow, { MiniMap, Controls, Background } from "reactflow";
// // import "reactflow/dist/style.css";

// // export default function VisualSchemaExplorer() {
// //   const { connectionStatus } = useApp();
// //   const { activeConnection } = useDatabase();

// //   const [expandedTables, setExpandedTables] = useState({});
// //   const [viewMode, setViewMode] = useState("list"); // "list" | "diagram"

// //   if (!activeConnection)
// //     return <p className="p-4 text-gray-400">No active connection</p>;

// //   const primaryUniqueKey =
// //     connectionStatus[connectionStatus.currentActiveDatabase]?.primaryUniqueKey ||
// //     [];

// //   // Group columns by database and table, include FK info
// //   const groupedData = primaryUniqueKey.reduce((acc, item) => {
// //     if (!acc[item.DatabaseName]) acc[item.DatabaseName] = {};
// //     if (!acc[item.DatabaseName][item.TableName])
// //       acc[item.DatabaseName][item.TableName] = [];

// //     acc[item.DatabaseName][item.TableName].push({
// //       name: item.ColumnName,
// //       keyType: item.KeyType,
// //       fkTable: item.ReferencedTable || null,
// //       fkColumn: item.ReferencedColumn || null,
// //     });

// //     return acc;
// //   }, {});

// //   const toggleTable = (db, table) => {
// //     setExpandedTables((prev) => ({
// //       ...prev,
// //       [`${db}.${table}`]: !prev[`${db}.${table}`],
// //     }));
// //   };

// //   const keyBadge = (col) => {
// //     let bg = "bg-gray-600 text-gray-100";
// //     let label = col.keyType;

// //     if (col.keyType === "PRIMARY") bg = "bg-yellow-300 text-gray-900";
// //     if (col.keyType === "UNIQUE") bg = "bg-blue-400 text-white";

// //     return (
// //       <span
// //         className={`px-2 py-0.5 rounded-full text-xs font-semibold ${bg}`}
// //         title={`Key: ${col.keyType}`}
// //       >
// //         {label}
// //       </span>
// //     );
// //   };

// //   // 🧩 Build nodes & edges for the diagram
// //   const diagramData = useMemo(() => {
// //     const nodes = [];
// //     const edges = [];
// //     let x = 0,
// //       y = 0;

// //     Object.entries(groupedData).forEach(([db, tables]) => {
// //       Object.keys(tables).forEach((tableName, i) => {
// //         const id = `${db}.${tableName}`;
// //         nodes.push({
// //           id,
// //           data: {
// //             label: (
// //               <div className="p-2 bg-gray-800 text-gray-100 rounded-lg shadow-md w-44">
// //                 <div className="font-semibold text-green-400 mb-1">{tableName}</div>
// //                 <div className="text-xs text-gray-400">
// //                   {tables[tableName].length} columns
// //                 </div>
// //               </div>
// //             ),
// //           },
// //           position: { x: (i % 4) * 250 + x, y: Math.floor(i / 4) * 180 + y },
// //           style: { borderRadius: 12, border: "1px solid #333" },
// //         });

// //         // Detect FKs
// //         tables[tableName].forEach((col) => {
// //           if (col.fkTable) {
// //             edges.push({
// //               id: `${tableName}-${col.name}->${col.fkTable}`,
// //               source: id,
// //               target: `${db}.${col.fkTable}`,
// //               label: `${col.name} → ${col.fkColumn}`,
// //               animated: true,
// //               style: { stroke: "#00ff99" },
// //               labelStyle: {
// //                 fill: "#ccc",
// //                 fontSize: 10,
// //               },
// //             });
// //           }
// //         });
// //       });
// //     });

// //     return { nodes, edges };
// //   }, [groupedData]);

// //   return (
// //     <div className="p-6 bg-gray-900 h-full overflow-auto space-y-6">
// //       {/* Toolbar */}
// //       <div className="flex justify-between items-center mb-4">
// //         <h2 className="text-xl font-semibold text-white flex items-center gap-2">
// //           <GitBranch className="text-green-400" />
// //           Visual Schema Explorer
// //         </h2>

// //         <button
// //           onClick={() => setViewMode(viewMode === "list" ? "diagram" : "list")}
// //           className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
// //         >
// //           <LayoutGrid size={16} />
// //           {viewMode === "list" ? "Diagram View" : "List View"}
// //         </button>
// //       </div>

// //       {viewMode === "list" ? (
// //         // 🧾 List View
// //         Object.keys(groupedData).map((db) => (
// //           <div key={db} className="space-y-4">
// //             <div className="flex items-center gap-2 text-2xl font-bold text-blue-400 mb-2">
// //               <Database className="w-6 h-6" />
// //               {db}
// //             </div>

// //             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
// //               {Object.keys(groupedData[db]).map((table) => (
// //                 <div
// //                   key={table}
// //                   className="bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-shadow overflow-hidden"
// //                 >
// //                   <div
// //                     className="flex justify-between items-center cursor-pointer p-4 bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-600 hover:to-gray-800"
// //                     onClick={() => toggleTable(db, table)}
// //                   >
// //                     <div className="flex items-center gap-2">
// //                       <Table className="w-5 h-5 text-green-400" />
// //                       <span className="font-semibold text-lg text-green-400">
// //                         {table}
// //                       </span>
// //                     </div>
// //                     <span className="text-gray-400">
// //                       {expandedTables[`${db}.${table}`] ? "▼" : "▶"}
// //                     </span>
// //                   </div>

// //                   {expandedTables[`${db}.${table}`] && (
// //                     <div className="p-4 space-y-2 border-t border-gray-700">
// //                       {groupedData[db][table].map((col,i) => (
// //                         <div
// //                           key={i}
// //                           className="flex justify-between items-center p-2 rounded hover:bg-gray-700 transition-colors"
// //                         >
// //                           <div className="flex flex-col">
// //                             <span className="font-mono text-sm text-gray-200">
// //                               {col.name}
// //                             </span>
// //                             {col.fkTable && (
// //                               <div className="flex items-center gap-1 text-xs text-red-400">
// //                                 <ArrowRight className="w-3 h-3" />
// //                                 {col.fkTable}.{col.fkColumn}
// //                               </div>
// //                             )}
// //                           </div>
// //                           {keyBadge(col)}
// //                         </div>
// //                       ))}
// //                     </div>
// //                   )}
// //                 </div>
// //               ))}
// //             </div>
// //           </div>
// //         ))
// //       ) : (
// //         // 🧭 Diagram View
// //         <div className="h-[75vh] bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
// //           <ReactFlow
// //             nodes={diagramData.nodes}
// //             edges={diagramData.edges}
// //             fitView
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
// //       )}
// //     </div>
// //   );
// // }

import React, { useState, useMemo } from "react";
import {
  Database,
  Table,
  ArrowRight,
  GitBranch,
  LayoutGrid,
  Hash,
} from "lucide-react";
import { useAppContext as useApp } from "../context/AppContext";
import { useDatabase } from "../context/DatabaseContext";
import ReactFlow, { MiniMap, Controls, Background } from "reactflow";
import "reactflow/dist/style.css";

export default function VisualSchemaExplorer() {
  const { connectionStatus } = useApp();
  const { activeConnection } = useDatabase();

  const [expandedTables, setExpandedTables] = useState({});
  const [viewMode, setViewMode] = useState("list"); // "list" | "diagram"

  if (!activeConnection)
    return <p className="p-4 text-gray-400">No active connection</p>;

  const primaryUniqueKey =
    connectionStatus[connectionStatus.currentActiveDatabase]?.primaryUniqueKey ||
    [];

  // 🧩 Group columns by DB & table (include FK + INDEX info)
  const groupedData = primaryUniqueKey.reduce((acc, item) => {
    if (!acc[item.DatabaseName]) acc[item.DatabaseName] = {};
    if (!acc[item.DatabaseName][item.TableName])
      acc[item.DatabaseName][item.TableName] = { columns: [], indexes: [] };

    // Push column info
    acc[item.DatabaseName][item.TableName].columns.push({
      name: item.ColumnName,
      keyType: item.KeyType,
      fkTable: item.ReferencedTable || null,
      fkColumn: item.ReferencedColumn || null,
    });

    // If this item is part of an index, add it
    if (item.KeyType === "INDEX" || item.KeyType === "UNIQUE") {
      acc[item.DatabaseName][item.TableName].indexes.push({
        indexName: item.IndexName || `${item.TableName}_${item.ColumnName}_idx`,
        columns: [item.ColumnName],
        type: item.KeyType,
      });
    }

    return acc;
  }, {});

  const toggleTable = (db, table) => {
    setExpandedTables((prev) => ({
      ...prev,
      [`${db}.${table}`]: !prev[`${db}.${table}`],
    }));
  };

  const keyBadge = (col) => {
    let bg = "bg-gray-600 text-gray-100";
    let label = col.keyType;

    if (col.keyType === "PRIMARY") bg = "bg-yellow-300 text-gray-900";
    if (col.keyType === "UNIQUE") bg = "bg-blue-400 text-white";
    if (col.keyType === "INDEX") bg = "bg-purple-400 text-white";

    return (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${bg}`}
        title={`Key: ${col.keyType}`}
      >
        {label}
      </span>
    );
  };

  // 🧭 Build diagram nodes & edges
  const diagramData = useMemo(() => {
    const nodes = [];
    const edges = [];
    let x = 0,
      y = 0;

    Object.entries(groupedData).forEach(([db, tables]) => {
      Object.keys(tables).forEach((tableName, i) => {
        const table = tables[tableName];
        const id = `${db}.${tableName}`;
        nodes.push({
          id,
          data: {
            label: (
              <div className="p-2 bg-gray-800 text-gray-100 rounded-lg shadow-md w-44">
                <div className="font-semibold text-green-400 mb-1">
                  {tableName}
                </div>
                <div className="text-xs text-gray-400">
                  {table.columns.length} columns
                </div>
                {table.indexes.length > 0 && (
                  <div className="text-[10px] text-purple-300 mt-1">
                    {table.indexes.map((idx,i) => (
                      <div key={i}>
                        <Hash className="inline w-3 h-3 mr-1" />
                        {idx.indexName} ({idx.columns.join(", ")})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ),
          },
          position: { x: (i % 4) * 250 + x, y: Math.floor(i / 4) * 200 + y },
          style: { borderRadius: 12, border: "1px solid #333" },
        });

        // FK edges
        table.columns.forEach((col) => {
          if (col.fkTable) {
            edges.push({
              id: `${tableName}-${col.name}->${col.fkTable}`,
              source: id,
              target: `${db}.${col.fkTable}`,
              label: `${col.name} → ${col.fkColumn}`,
              animated: true,
              style: { stroke: "#00ff99" },
              labelStyle: { fill: "#ccc", fontSize: 10 },
            });
          }
        });

        // INDEX edges (dashed)
        table.indexes.forEach((idx) => {
          idx.columns.forEach((col) => {
            edges.push({
              id: `${tableName}-${col}-index`,
              source: id,
              target: id,
              label: `${idx.indexName}`,
              type: "smoothstep",
              animated: false,
              style: { stroke: "#a855f7", strokeDasharray: "4 2" },
              labelStyle: { fill: "#a855f7", fontSize: 9 },
            });
          });
        });
      });
    });

    return { nodes, edges };
  }, [groupedData]);

  return (
    <div className="p-6 bg-gray-900 h-full overflow-auto space-y-6">
      {/* Toolbar */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <GitBranch className="text-green-400" />
          Visual Schema Explorer
        </h2>

        <button
          onClick={() => setViewMode(viewMode === "list" ? "diagram" : "list")}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          <LayoutGrid size={16} />
          {viewMode === "list" ? "Diagram View" : "List View"}
        </button>
      </div>

      {viewMode === "list" ? (
        // 🧾 List View
        Object.keys(groupedData).map((db,i) => (
          <div key={i} className="space-y-4">
            <div className="flex items-center gap-2 text-2xl font-bold text-blue-400 mb-2">
              <Database className="w-6 h-6" />
              {db}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.keys(groupedData[db]).map((table,i) => {
                const tbl = groupedData[db][table];
                return (
                  <div
                    key={i}
                    className="bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-shadow overflow-hidden"
                  >
                    <div
                      className="flex justify-between items-center cursor-pointer p-4 bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-600 hover:to-gray-800"
                      onClick={() => toggleTable(db, table)}
                    >
                      <div className="flex items-center gap-2">
                        <Table className="w-5 h-5 text-green-400" />
                        <span className="font-semibold text-lg text-green-400">
                          {table}
                        </span>
                      </div>
                      <span className="text-gray-400">
                        {expandedTables[`${db}.${table}`] ? "▼" : "▶"}
                      </span>
                    </div>

                    {expandedTables[`${db}.${table}`] && (
                      <div className="p-4 space-y-3 border-t border-gray-700">
                        {/* Columns */}
                        {tbl.columns.map((col, i) => (
                          <div
                            key={i}
                            className="flex justify-between items-center p-2 rounded hover:bg-gray-700 transition-colors"
                          >
                            <div className="flex flex-col">
                              <span className="font-mono text-sm text-gray-200">
                                {col.name}
                              </span>
                              {col.fkTable && (
                                <div className="flex items-center gap-1 text-xs text-red-400">
                                  <ArrowRight className="w-3 h-3" />
                                  {col.fkTable}.{col.fkColumn}
                                </div>
                              )}
                            </div>
                            {keyBadge(col)}
                          </div>
                        ))}

                        {/* Indexes */}
                        {tbl.indexes.length > 0 && (
                          <div className="pt-2 border-t border-gray-700 text-xs text-purple-300 space-y-1">
                            <div className="flex items-center gap-1 font-semibold">
                              <Hash className="w-3 h-3" />
                              Indexes
                            </div>
                            {tbl.indexes.map((idx,i) => (
                              <div key={i}>
                                {idx.indexName}: {idx.columns.join(", ")}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      ) : (
        // 🌐 Diagram View
        <div className="h-[75vh] bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
          <ReactFlow
            nodes={diagramData.nodes}
            edges={diagramData.edges}
            fitView
            defaultEdgeOptions={{
              type: "smoothstep",
              style: { strokeWidth: 1.5 },
            }}
          >
            <MiniMap />
            <Controls />
            <Background color="#333" gap={16} />
          </ReactFlow>
        </div>
      )}
    </div>
  );
}
