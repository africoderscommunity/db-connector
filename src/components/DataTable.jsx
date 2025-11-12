import { useState, useEffect, useRef } from "react";
import { useDatabase } from "../context/DatabaseContext";
import ReactJson from 'react18-json-view';
 

export default function DataTable() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const [activeMenu, setActiveMenu] = useState(null);
  const [changedCells, setChangedCells] = useState({});
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingQuery, setPendingQuery] = useState("");
  const [discardModalOpen, setDiscardModalOpen] = useState(false);
  const [editingCell, setEditingCell] = useState(null);

  const {
    tableData: ValidTableData,
    setTableData: setValidTableData,
    setQueryText,selectedTable,
    activeConnection,
    executeQuery
  } = useDatabase();

  const dbType = activeConnection?.type;
  const originalDataRef = useRef(JSON.parse(JSON.stringify(ValidTableData)));

  if (!ValidTableData?.columns?.length || !ValidTableData?.rows?.length) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center text-gray-400 text-lg">
        No data available
      </div>
    );
  }

  // --- helpers ---
  const isStructured = (val) => {
    if(val instanceof Date) return false
    if (val === null || val === undefined) return false;
    // if (val.$oid  ) return false;
    if (typeof val === "object") return true;
    
    if (typeof val === "string") {
      try {
        const parsed = JSON.parse(val);
        return typeof parsed === "object";
      } catch {
        return false;
      }
    }
    return false;
  };

 

  const formatValue = (val) => {
     
    if (val === null || val === undefined) return "NULL";
    if (val === "") return "empty";
    if (val instanceof Date) return val.toISOString();
    if (typeof val === "object" && val !== null) {
      if (val.$oid){
        // return `ObjectId("${val.$oid}")`;}
       
        
        return  val.$oid ;}
      if (val.$date) {
        try {
          return new Date(val.$date).toISOString();
        } catch {
          return String(val.$date);
        }
      }
      if (Array.isArray(val)) return `[Array(${val.length})]`;
      return "{Object}";
    }
    if (typeof val === "string") {
      try {
        const parsed = JSON.parse(val);
        return formatValue(parsed);
      } catch {
        return val;
      }
    }
    return String(val);
  };

  // --- editing logic ---
  const handleMenuToggle = (i) => {
    setActiveMenu(activeMenu === i ? null : i);
  };

  const handleEdit = (rowIndex, colIndex, value) => {
    console.log({value})
    setValidTableData((prev) => {
      const newRows = prev.rows.map((r) => [...r]);
      newRows[rowIndex][colIndex] = value;
      return { ...prev, rows: newRows };
    });

    setChangedCells((prev) => ({
      ...prev,
      [`${rowIndex}_${colIndex}`]: value,
    }));
  };

  const handleCellClick = (cell, i, j) => {
    if (isStructured(cell)) {
      try {
        const formatted =
          typeof cell === "string"
            ? JSON.stringify(JSON.parse(cell), null, 2)
            : JSON.stringify(cell, null, 2);
        setModalContent(formatted);
        setModalOpen(true);
        setEditingCell({ i, j });
      } catch {
        setModalContent(String(cell));
        setModalOpen(true);
        setEditingCell({ i, j });
      }
    }
  };

  const handleSaveJsonEdit = () => {
    try {
      const parsed = JSON.parse(modalContent);
      const { i, j } = editingCell;
      handleEdit(i, j, parsed);
      setModalOpen(false);
    } catch (err) {
      alert("❌ Invalid JSON format");
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(modalContent);
  };
const formatSqlValue = (val) => {
  if (val === null || val === undefined) return "NULL";
  if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace("T", " ")}'`;
  if (typeof val === "string") return `'${val.replace(/'/g, "''")}'`;
  return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
};

function normalizeMongoValue(value) {
  // Handle MongoDB extended JSON formats
  if (value && typeof value === 'object') {
    if (value.$oid) {
      // ObjectId representation
      return `ObjectId('${value.$oid}')`;
    }
    if (value.$date) {
      // Handle MongoDB date object
      const dateVal =
        typeof value.$date === 'object' && value.$date.$numberLong
          ? new Date(Number(value.$date.$numberLong)).toISOString()
          : new Date(value.$date).toISOString();
      return `ISODate('${dateVal}')`;
    }
  }

  // Return primitive values or unmodified objects
  return value;
} 
 
const handleUpdate = (rowIndex) => {
  const row = ValidTableData.rows[rowIndex];
  const primaryKey = ValidTableData.columns[0];
  const primaryKeyValue = row[0];

  // Build object of changed values
  const updateObj = {};
  ValidTableData.columns.forEach((col, idx) => {
    const key = `${rowIndex}_${idx}`;
    if (key in changedCells) updateObj[col] = row[idx];
  });

  if (!Object.keys(updateObj).length) {
    alert("No changes detected for this row.");
    return;
  }

  let queryString;
 

  if (dbType === "mssql") {
    const updates = Object.entries(updateObj)
      .map(([col, val]) => `${col} = ${formatSqlValue(val)}`)
      .join(", ");
    queryString = `UPDATE ${selectedTable || "my_table"} SET ${updates} WHERE ${primaryKey} = '${primaryKeyValue}';`;
  } else if (dbType === "mongodb") {
 let filterString;

if (primaryKey === "_id") {
  filterString=
    typeof primaryKeyValue === "object" && "$oid" in primaryKeyValue
       ? `{ _id: ObjectId("${primaryKeyValue.$oid}") }`
      : primaryKeyValue;
} else {
  filterString = `{ ${primaryKey}: "${primaryKeyValue}" }`;
}

const updatePart = JSON.stringify({ $set: updateObj }, null, 2);

  queryString = `db.${selectedTable || "my_collection"}.updateOne(
  ${filterString},
  ${updatePart}
);`;
  }

  // Set query string for UI
  setQueryText(queryString,);
  console.log({ queryString,  }, "single update",executeQuery);

  // // Execute
  // if (dbType === "mongodb" && mongoUpdateObject) {
    executeQuery(queryString,{ $set: updateObj });
  // } else {
  //   executeQuery(queryString);
  // }

  // Clear changed cells for this row
  setChangedCells((prev) => {
    const updated = { ...prev };
    ValidTableData.columns.forEach((_, idx) => {
      delete updated[`${rowIndex}_${idx}`];
    });
    return updated;
  });
};

  const handleUpdateAll = () => {
    if (!Object.keys(changedCells).length) {
      alert("No changes detected to save!");
      return;
    }

    if (dbType === "mssql") {
      const queries = [];

      Object.keys(changedCells).forEach((key) => {
        const [rowIndex, colIndex] = key.split("_").map(Number);
        const row = ValidTableData.rows[rowIndex];
        const col = ValidTableData.columns[colIndex];
        const val = row[colIndex];
        const formatted = formatSqlValue(val) 


        queries[rowIndex] = queries[rowIndex] || [];
        queries[rowIndex].push(`${col} = ${formatted}`);
      });

      const queryStrings = queries
        .map((rowUpdates, i) => {
          if (!rowUpdates) return null;
          const primaryKey = ValidTableData.columns[0];
          const primaryKeyValue = ValidTableData.rows[i][0];
          return `UPDATE ${selectedTable || "my_table"} SET ${rowUpdates.join(
            ", "
          )} WHERE ${primaryKey} = '${primaryKeyValue}';`;
        })
        .filter(Boolean)
        .join("\n");

      setPendingQuery(queryStrings);
      setConfirmModalOpen(true);
    } else if (dbType === "mongodb") {
      const bulkActions = [];

      Object.keys(changedCells).forEach((key) => {
        const [rowIndex, colIndex] = key.split("_").map(Number);
        const row = ValidTableData.rows[rowIndex];
        const col = ValidTableData.columns[colIndex];
        const primaryKey = ValidTableData.columns[0];
        const primaryKeyValue = row[0];

        let existingAction = bulkActions.find(
          (a) => a.updateOne.filter[primaryKey] === primaryKeyValue
        );

        if (!existingAction) {
          existingAction = {
            updateOne: {
              filter: { [primaryKey]: primaryKeyValue },
              update: { $set: {} },
            },
          };
          bulkActions.push(existingAction);
        }

        existingAction.updateOne.update.$set[col] = row[colIndex];
      });

      const bulkWriteString =
        `db.${selectedTable}.bulkWrite([\n` +
        bulkActions
          .map(
            (a) =>
              `  {\n    updateOne: {\n      filter: { ${Object.keys(
                a.updateOne.filter
              )
                .map((k) => `${k}: ObjectId(${a.updateOne.filter[k]})`)
                .join(", ")} },\n      update: ${JSON.stringify(
                a.updateOne.update,
                null,
                8
              )}\n    }\n  }`
          )
          .join(",\n") +
        `\n]);`;

      setPendingQuery(bulkWriteString);
      setConfirmModalOpen(true);
    }
  };

  const handleDiscard = () => {
    if (Object.keys(changedCells).length > 0) {
      const revertedData = JSON.parse(JSON.stringify(originalDataRef.current));
      setValidTableData({ ...revertedData });
      setChangedCells({});
    }
    setDiscardModalOpen(false);
  };

  // --- keyboard shortcuts ---
  // useEffect(() => {
  //   const handleKeyDown = (e) => {
  //     if ((e.ctrlKey || e.metaKey) && e.key === "s") {
  //       e.preventDefault();
  //       Object.keys(changedCells).length
  //         ? handleUpdateAll()
  //         : alert("No changes detected to save!");
  //     }
  //     if ((e.ctrlKey || e.metaKey) && e.key === "r") {
  //       e.preventDefault();
  //       Object.keys(changedCells).length
  //         ? setDiscardModalOpen(true)
  //         : alert("No changes to discard!");
  //     }
  //   };
  //   document.addEventListener("keydown", handleKeyDown);
  //   return () => document.removeEventListener("keydown", handleKeyDown);
  // }, [changedCells]);

  // --- render ---
  return (
    <>
      {/* Confirm + Discard modals (unchanged) */}
      {confirmModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 w-[500px]">
            <h2 className="text-lg font-semibold text-white mb-4">
              Confirm Update
            </h2>
            <p className="text-gray-300 mb-6">
              Apply all unsaved changes to the database?
            </p>
            <div className="flex justify-end gap-4">
              <button
                className="px-4 py-2 bg-gray-700 text-gray-200 rounded"
                onClick={() => setConfirmModalOpen(false)}
              >
                No
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded"
                onClick={() => {
                  console.log({pendingQuery}, "multiple updte")
                  // setQueryText(pendingQuery);
                  executeQuery(pendingQuery)
                  setConfirmModalOpen(false);
                  setChangedCells({});
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
      {discardModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 w-[500px]">
            <h2 className="text-lg font-semibold text-white mb-4">
              Discard Changes
            </h2>
            <p className="text-gray-300 mb-6">
              Are you sure you want to discard all unsaved changes?
            </p>
            <div className="flex justify-end gap-4">
              <button
                className="px-4 py-2 bg-gray-700 text-gray-200 rounded"
                onClick={() => setDiscardModalOpen(false)}
              >
                No
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded"
                onClick={handleDiscard}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-gray-900 rounded-2xl border border-gray-700">
       
<table className="w-full">
  <thead>
    <tr className="bg-gray-800 text-gray-200">
      {ValidTableData.columns.map((col, i) => (
        <th key={i} className="px-5 py-3 text-left">
          {col}
        </th>
      ))}
      <th className="px-5 py-3 text-sm font-semibold">Actions</th>
    </tr>
  </thead>
  <tbody>
    {ValidTableData.rows.map((row, i) => {
      const rowHasChanges = ValidTableData.columns.some((_, j) =>
        changedCells?.hasOwnProperty(`${i}_${j}`)
      );

      return (
        <tr
          key={i}
          className="border-t border-gray-700 hover:bg-gray-800 relative"
        >
          {row.map((cell, j) => {
            const isChanged = changedCells?.hasOwnProperty(`${i}_${j}`);
            const isEditing = editingCell === `${i}_${j}`;
            const structured = isStructured(cell);

            return (
              <td
                key={j}
                className={`px-4 py-3 text-sm text-gray-300 ${
                  structured
                    ? "cursor-pointer text-blue-400 underline"
                    : "cursor-text"
                } ${isChanged ? "bg-yellow-900/30 border-l-2 border-yellow-500" : ""}`}
                onClick={() => {
                  if (!structured) setEditingCell(`${i}_${j}`);
                  handleCellClick(cell, i, j);
                }}
              >
                {isEditing && !structured ? (
                  <input
                    autoFocus
                    className="bg-gray-900 text-gray-300 px-4 py-4 w-full"
                    value={cell}
                    onChange={(e) => handleEdit(i, j, e.target.value)}
                    onBlur={() => setEditingCell(null)}
                  />
                ) : (
                  formatValue(cell)
                )}
              </td>
            );
          })}

          <td className="px-4 py-3 text-center">
            <button
              onClick={() => handleMenuToggle(i)}
              className="px-2 py-1 rounded hover:bg-gray-700 text-gray-300"
            >
              ⋮
            </button>
            {rowHasChanges && activeMenu === i && (
              <div className="absolute right-5 mt-2 bg-gray-800 border border-gray-700 rounded shadow-lg z-10">
                <button
                  onClick={() => handleUpdate(i)}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                >
                  Update Record
                </button>
              </div>
            )}
          </td>
        </tr>
      );
    })}
  </tbody>
</table>

        {/* JSON edit modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-xl p-6 w-[650px] max-h-[80vh] overflow-auto shadow-2xl border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">Edit Object</h2>
                <div className="flex gap-3">
                  <button
                    onClick={handleCopyToClipboard}
                    className="px-3 py-1 text-xs bg-gray-800 rounded hover:bg-gray-700 text-gray-200"
                  >
                    Copy
                  </button>
                  <button
                    onClick={handleSaveJsonEdit}
                    className="px-3 py-1 text-xs bg-green-600 rounded hover:bg-green-700 text-white"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="px-3 py-1 text-xs bg-red-600 rounded hover:bg-red-700 text-white"
                  >
                    Close
                  </button>
                </div>
              </div>

              <textarea
                className="w-full bg-gray-800 text-gray-200 rounded-lg p-4 text-sm font-mono resize-none"
                style={{ height: "60vh" }}
                value={
                  modalContent
                }
                onChange={(e) => setModalContent(e.target.value)}
              />
              
            </div>
          </div>
        )}
      </div>
    </>
  );
}
