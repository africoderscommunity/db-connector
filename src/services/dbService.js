import { getDefaultPort } from '../utils/dbUtils';

export const dbService = {
  connectToDatabase: async (conn, loadTables = true, setters) => {
    const { setLoading, setError, setActiveConnection, setTables, setConnectingId } = setters;
    console.log({setLoading, setError, setActiveConnection, setTables, setConnectingId })
    setLoading(true);
    setError('');

    try {
      localStorage.setItem('active_connection', conn.id);
      const result = await window.electron.db.connect(conn);
      if (result.success) {
        setActiveConnection(conn);
        if (loadTables) {
          const tablesResult = await dbService.LoadDbTable({ connectionId: conn.id }, { setTables });
          if (!tablesResult.success) setError(tablesResult.error || 'Failed to load tables');
        }
      } else {
        setError(result.error || 'Connection failed');
      }
    } catch (err) {
      setError(err.message || 'Failed to connect to database');
    } finally {
      setLoading(false);
      setConnectingId(conn.id);
    }
  },

  LoadDbTable: async (tableConfig, { setTables }) => {
    const tablesResult = await window.electron.db.getTables(tableConfig);
    if (tablesResult.success) setTables(tablesResult.tables);
    return tablesResult;
  },

  deleteConnection: async (
    id,
    {
      activeConnection,
      setActiveConnection,
      setTables,
      setSelectedTable,
      setTableData,
      connections,
      saveConnections,
    }
  ) => {
    try {
      if (activeConnection?.id === id) {
        await window.electron.db.disconnect(id);
        setActiveConnection(null);
        setTables([]);
        setSelectedTable(null);
        setTableData(null);
      }
      saveConnections(connections.filter((c) => c.id !== id));
    } catch (err) {
      console.error('❌ Failed to delete connection:', err);
    }
  },

 loadTableData: async (
    tableName,
    {
      newOffset = 0,
      connectionId,
      limit=100,
      setLoading,
      setSelectedTable,
      setQueryResult,
      addLog,
      setTableData,
      setOffset,
      setTotalCount,
      setError,
    }
  ) => {
    setLoading(true);
    setSelectedTable(tableName);
    setQueryResult(null);

    try {
      const result = await window.electron.db.getTableData({
        connectionId,
        tableName,
        limit,
        offset: newOffset,
      });

      console.log({ result });

      // Log successful queries
      result?.data?.allQueries && addLog?.('success', `${result.data.allQueries}`);

      if (result.success) {
        setTableData(result.data);
        setOffset(newOffset);
        setTotalCount(result.data.totalCount || result.data.rowsAffected || 0);
      } else {
        setError(result.error || 'Failed to load table data');
      }
    } catch (err) {
      setError(err.message || 'Failed to load table data');
    } finally {
      setLoading(false);
    }
  },




  testConnection: async (formData, { setTestingConnection, setError }) => {
    setTestingConnection(true);
    setError('');
    try {
      const isMongo = formData.type === 'mongodb';
      if (!formData.name || (!isMongo && (!formData.host || !formData.database)) || (isMongo && !formData.mongoUrlLink)) {
        setError('Please fill all required fields');
        return;
      }

      const payload = isMongo
        ? { type: 'mongodb', name: formData.name, database: formData.database, mongoUrlLink: formData.mongoUrlLink }
        : { ...formData, port: formData.port || getDefaultPort(formData.type) };

      const result = await window.electron.db.testConnection(payload);
      if (!result.success) setError(result.error || 'Connection failed');
      else alert('✅ Connection successful!');
    } catch (err) {
      setError(err.message || 'Connection test failed');
    } finally {
      setTestingConnection(false);
    }
  },

  addConnection: ({ formData, editingId, connections, saveConnections, setFormData, setShowAddForm, setEditingId, setError }) => {
    const isMongo = formData.type === 'mongodb';
    if (!formData.name || (isMongo && !formData.mongoUrlLink) || (!isMongo && (!formData.host || !formData.database))) {
      setError('Please fill all required fields');
      return;
    }

    const newConn = isMongo
      ? { id: editingId || Date.now().toString(), type: 'mongodb', name: formData.name, database: formData.database, mongoUrlLink: formData.mongoUrlLink }
      : { ...formData, id: editingId || Date.now().toString(), port: formData.port || getDefaultPort(formData.type) };

    const updatedConnections = editingId ? connections.map(c => (c.id === editingId ? newConn : c)) : [...connections, newConn];

    saveConnections(updatedConnections);
    setFormData({ name: '', type: 'mysql', host: 'localhost', port: '', database: '', username: '', password: '', mongoUrlLink: '' });
    setShowAddForm(false);
    setError('');
    setEditingId(null);
  },
  editConnection: ({setFormData,setShowAddForm , setEditingId, conn}) => {
  setFormData({ ...conn });
  setShowAddForm(true);
  setEditingId(conn.id);
},
  exportData: (selectedTable)=>(data) => {
     if (!data) return;
    
    const csv = [
      data.columns.join(','),
      ...data.rows.map(row => row.map(cell => {
        // Escape cells containing commas or quotes
        const str = String(cell || '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable || 'query_result'}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
  executeQuery : async (query, queryObject = {}, context) => {
  const {
    activeConnection,
    setError,
    setLoading,
    setTableData,
    addLog,
    setSelectedTable,
    queryText
  } = context;

  console.log({ queryText: query, query });

  const databaseQuery = (query || queryText)?.trim();
  if (!databaseQuery) {
    setError('Please enter a query');
    return;
  }

  setLoading(true);
  setError('');

  try {
    console.log({
      connectionId: activeConnection?.id ,
    });

    const result = await window.electron.db.executeQuery({
      connectionId: activeConnection?.id ,
      query: databaseQuery,
      queryObject,
    });

    console.log({ result });

    if (result.success) {
      addLog('success', `${result.data.allQueries}`);
      setTableData(result.data);
      setSelectedTable(null);
    } else {
      console.log(result);
      setError(result.error || 'Query execution failed');
    }
  } catch (err) {
    console.log(err);
    setError(err.message || 'Query execution failed');
  } finally {
    setLoading(false);
  }
}

};


 