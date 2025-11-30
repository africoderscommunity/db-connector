import { createRoot } from "react-dom/client";
import App from "./client/app";
import "./client/index.css";
import { AppProvider } from "./client/context/AppContext";
import { DatabaseProvider } from "./client/context/DatabaseContext";

createRoot(document.getElementById("root")).render(
    <AppProvider>
  <DatabaseProvider>

      <App />
  </DatabaseProvider>

    </AppProvider>
);
