# DataTable Component

A refactored, modular DataTable component for displaying and editing database records with support for both SQL (MSSQL) and NoSQL (MongoDB) databases.

## Structure

```
DataTable/
├── index.jsx                  # Main DataTable component
├── components/               # UI components
│   ├── ConfirmModal.jsx     # Confirmation modal for bulk updates
│   ├── DiscardModal.jsx     # Modal for discarding changes
│   ├── JsonEditModal.jsx    # Modal for editing JSON/object data
│   ├── TableCell.jsx        # Individual table cell with edit functionality
│   ├── TableRow.jsx         # Table row with action menu
│   └── index.js             # Barrel export for components
├── hooks/                    # Custom React hooks
│   ├── useTableUpdates.js   # Handles all update logic and state
│   ├── useTableKeyboardShortcuts.js  # Keyboard shortcuts (Cmd/Ctrl+S, Cmd/Ctrl+R)
│   ├── useJsonModal.js      # JSON modal state and handlers
│   └── index.js             # Barrel export for hooks
├── utils/                    # Utility functions
│   └── queryBuilders.js     # SQL and MongoDB query builders
└── README.md                 # This file
```

## Components

### Main Component: `DataTable`
The entry point that orchestrates all subcomponents and hooks.

**Location:** [index.jsx](index.jsx)

### UI Components

#### `ConfirmModal`
Displays a confirmation dialog before executing bulk updates.

**Props:**
- `isOpen` (boolean): Controls modal visibility
- `onClose` (function): Called when user cancels
- `onConfirm` (function): Called when user confirms
- `pendingQuery` (string): The query to be executed

#### `DiscardModal`
Displays a confirmation dialog before discarding all changes.

**Props:**
- `isOpen` (boolean): Controls modal visibility
- `onClose` (function): Called when user cancels
- `onConfirm` (function): Called when user confirms

#### `JsonEditModal`
Provides a text editor for viewing and editing JSON/object data.

**Props:**
- `isOpen` (boolean): Controls modal visibility
- `modalContent` (string): The JSON content to edit
- `onContentChange` (function): Called when content changes
- `onSave` (function): Called when user saves
- `onCopy` (function): Called when user copies
- `onClose` (function): Called when user closes

#### `TableCell`
Renders individual table cells with inline editing capability.

**Props:**
- `cell` (any): The cell value
- `rowIndex` (number): Row index
- `colIndex` (number): Column index
- `isChanged` (boolean): Whether cell has unsaved changes
- `isEditing` (boolean): Whether cell is currently being edited
- `onEdit` (function): Called when cell value changes
- `onClick` (function): Called when cell is clicked
- `onBlur` (function): Called when cell loses focus

#### `TableRow`
Renders a complete table row with action menu.

**Props:**
- `row` (array): The row data
- `rowIndex` (number): Row index
- `columns` (array): Column names
- `changedCells` (object): Map of changed cells
- `editingCell` (string): Currently editing cell key
- `activeMenu` (number): Index of row with active menu
- `onEdit` (function): Edit handler
- `onCellClick` (function): Cell click handler
- `setEditingCell` (function): Set editing cell
- `onMenuToggle` (function): Toggle action menu
- `onUpdate` (function): Update single row

## Hooks

### `useTableUpdates`
Manages all table update logic including edits, saves, and discards.

**Parameters:**
- `tableData`: Current table data
- `setTableData`: Function to update table data
- `dbType`: Database type ('mssql' or 'mongodb')
- `selectedTable`: Current table/collection name
- `setQueryText`: Function to update query text in UI
- `executeQuery`: Function to execute queries

**Returns:**
- `changedCells`: Object mapping cell positions to changed values
- `pendingQuery`: Query string pending confirmation
- `confirmModalOpen`: Confirm modal state
- `discardModalOpen`: Discard modal state
- `handleEdit`: Function to edit a cell
- `handleUpdate`: Function to update a single row
- `handleUpdateAll`: Function to update all changed rows
- `confirmUpdateAll`: Function to confirm bulk update
- `handleDiscard`: Function to discard all changes
- `setConfirmModalOpen`: Set confirm modal state
- `setDiscardModalOpen`: Set discard modal state

### `useTableKeyboardShortcuts`
Adds keyboard shortcuts for save and discard actions.

**Shortcuts:**
- `Cmd/Ctrl + S`: Save all changes
- `Cmd/Ctrl + R`: Discard all changes

**Parameters:**
- `changedCells`: Object of changed cells
- `handleUpdateAll`: Function to save all changes
- `setDiscardModalOpen`: Function to open discard modal

### `useJsonModal`
Manages the JSON editing modal state and handlers.

**Parameters:**
- `handleEdit`: Function to handle cell edits

**Returns:**
- `modalOpen`: Modal visibility state
- `modalContent`: Current JSON content
- `editingCell`: Currently editing cell key
- `setEditingCell`: Set editing cell
- `setModalOpen`: Set modal state
- `setModalContent`: Set modal content
- `handleCellClick`: Handle cell clicks to open modal
- `handleSaveJsonEdit`: Save JSON edits
- `handleCopyToClipboard`: Copy JSON to clipboard

## Utilities

### `queryBuilders.js`
Contains functions to build SQL and MongoDB queries.

#### `buildSingleUpdateQuery(dbType, selectedTable, tableData, rowIndex, changedCells)`
Builds a query to update a single row.

**Returns:** Object with `queryString` and `updateData`

#### `buildBulkUpdateQuery(dbType, selectedTable, tableData, changedCells)`
Builds a query to update multiple rows at once.

**Returns:** Query string

## Features

- **Inline Editing**: Click any cell to edit its value
- **JSON Editing**: Click structured data to open a JSON editor
- **Change Tracking**: Visual indicators for modified cells
- **Bulk Updates**: Save all changes at once or update rows individually
- **Discard Changes**: Revert all unsaved changes
- **Keyboard Shortcuts**: Quick save and discard with keyboard
- **Multi-Database Support**: Works with MSSQL and MongoDB

## Usage Example

```jsx
import DataTable from './components/DataTable'

function App() {
  return <DataTable />
}
```

The component automatically connects to the DatabaseContext and manages its own state.

## Dependencies

- React (useState, useEffect, useRef)
- DatabaseContext (from context/DatabaseContext)
- Formatters utility (from utils/formatters)
  - `isStructured`: Checks if value is an object/array
  - `formatValue`: Formats values for display
  - `formatSqlValue`: Formats values for SQL queries
