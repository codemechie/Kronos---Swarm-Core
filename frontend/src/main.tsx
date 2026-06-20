import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { KronosProvider } from "./context/KronosProvider";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <KronosProvider>
      <App />
    </KronosProvider>
  </StrictMode>,
);
