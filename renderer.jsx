import { createRoot } from "react-dom/client";
import App from "./src/app";
import "./src/index.css";
import { AppProvider } from "./src/context/AppContext";
import { DatabaseProvider } from "./src/context/DatabaseContext";

createRoot(document.getElementById("root")).render(
    <AppProvider>
  <DatabaseProvider>

      <App />
  </DatabaseProvider>

    </AppProvider>
);
