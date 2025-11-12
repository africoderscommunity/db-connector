import React, { useState } from "react";
import {
  MoreVertical,
  Edit2,
  Trash2,
  Database,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useDatabase } from "../context/DatabaseContext";
import { useAppContext } from "../context/AppContext";

export default function Connection() {
  const {
    connectToDatabase,
    LoadDbTable,
    setActiveConnection,
    setConnectingId,
    setTables,
    tables,
    connections,
    activeConnection,
    editConnection,
    deleteConnection,
  } = useDatabase();

  const { connectionStatus } = useAppContext();

  const [openMenuId, setOpenMenuId] = useState(null);
  const [expandedConnectionId, setExpandedConnectionId] = useState(null);

  const toggleMenu = (id) => setOpenMenuId(openMenuId === id ? null : id);
  const closeMenu = () => setOpenMenuId(null);
  const toggleExpand = (id) =>
    setExpandedConnectionId(expandedConnectionId === id ? null : id);
  const loadDatabasebTable = (conn,db="") => async () => {
    setConnectingId(conn.id);
    setActiveConnection(conn);
    return await LoadDbTable({connectionId:conn.id,db});
  };

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 overflow-y-auto relative">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-gray-400 mb-3">
          CONNECTIONS
        </h2>

        {connections.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            No connections yet
          </p>
        ) : (
          connections.map((conn) => {
            const isExpanded = expandedConnectionId === conn.id;

            return (
              <div key={conn.id} className="mb-2">
                {/* ===== Connection Card ===== */}
                <div
                  className={`p-3 rounded-lg transition relative cursor-pointer ${
                    activeConnection?.id === conn.id
                      ? "bg-gray-700"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                  onClick={() => {
                   if (conn.type !== "mongodb"){ 
                          connectionStatus?.[conn.id]?.status && loadDatabasebTable(conn)();
                   }else{
                    toggleExpand(conn.id)
                   }
                  }}
                >
                  <div className="flex items-center justify-between">
                    {/* Connection Info */}
                    <div className="flex flex-col gap-1 truncate">
                      <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-gray-600 bg-gray-800/60 text-gray-300 w-max">
                        {connectionStatus?.[conn.id]?.status ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                            <span className="text-green-400 font-medium">
                              Connected
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-red-400"></span>
                            <span className="text-red-400 font-medium">
                              Not Connected
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2 font-medium truncate text-sm">
                        {conn.type === "mongodb" && connectionStatus?.[conn.id]?.databases?.length > 0 && 
                          (isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          ))}
                        {conn.name}
                      </div>

                      <div className="text-xs text-gray-400 truncate">
                        {conn.type.toUpperCase()} •{" "}
                        {conn.host || conn.mongoUrlLink || ""}
                      </div>
                    </div>

                    {/* More Options */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMenu(conn.id);
                      }}
                      className="p-1 hover:bg-gray-600 rounded"
                      title="More options"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-300" />
                    </button>
                  </div>

                  {/* Dropdown Menu */}
                  {openMenuId === conn.id && (
                    <div
                      className="absolute right-3 top-10 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-10 w-40"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          closeMenu();
                          const loadTable = conn.type === "mongodb" ? false : true
                          connectToDatabase(conn,loadTable );
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 rounded-t"
                      >
                        <Database className="w-4 h-4 text-green-400" />
                        { connectionStatus?.[conn.id]?.status ?"Refresh ": "Connect to DB"}
                      </button>

                      <button
                        onClick={() => {
                          closeMenu();
                          editConnection && editConnection(conn);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
                      >
                        <Edit2 className="w-4 h-4 text-yellow-400" />
                        Edit
                      </button>

                      <button
                        onClick={() => {
                          closeMenu();
                          if (confirm(`Delete connection "${conn.name}"?`)) {
                            deleteConnection(conn.id);
                          }
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 rounded-b"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* ===== MongoDB Databases List (Outside Gray Box) ===== */}
                {conn.type === "mongodb" && isExpanded && connectionStatus?.[conn.id]?.databases?.length > 0 && (
                  <div className="ml-6 mt-1 text-xs text-gray-300 space-y-1 border-l border-gray-700 pl-2">
                    {connectionStatus?.[conn.id]?.databases?.map((db, i) => (
                      <div
                        key={i}
                        className="cursor-pointer hover:text-white transition"
                          onClick={() => {
                          connectionStatus?.[conn.id]?.status && loadDatabasebTable(conn,db)();
                  }}
                      >
                        • {db}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {openMenuId && (
        <div className="fixed inset-0 z-0" onClick={closeMenu}></div>
      )}
    </div>
  );
}
