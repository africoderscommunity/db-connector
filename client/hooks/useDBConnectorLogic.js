import { useEffect } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useAppContext } from '../context/AppContext';

export function useDBConnectorLogic() {
  const {
    error,
    setError,
    activeConnection,
    loadConnections,
    setActiveConnection,
    setTables,
  } = useDatabase();

  const {
    connectionStatus,
    setConnectionStatus,
  } = useAppContext();

  // Load saved connections on mount
  useEffect(() => {
    loadConnections();
  }, []);

  // Auto clear error
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(timer);
  }, [error]);

  // Listen for DB connected event
  useEffect(() => {
    const handler = (payload) => {
      alert(payload.message);
      setConnectionStatus((prev) => ({
        ...prev,
        [payload.id]: {
          status: true,
          connectionId: payload.id,
          databases: payload.databases,
        },
      }));
    };

    window.electron.onDbConnected(handler);

    return () => {};
  }, []);

  // Restore session from Electron cached state
  useEffect(() => {
    window.electron.db.getSessionStatus().then((res) => {
      if (JSON.stringify(connectionStatus) === JSON.stringify(res)) return;

      const active = res?.[res?.currentActiveDatabase];
      if (!active) return;

      const { config, tables } = active;

      setActiveConnection(config);
      setConnectionStatus(res);
      setTables(tables);
    });
  }, []);
}
