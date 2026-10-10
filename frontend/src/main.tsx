import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AppPrivyProvider } from "./providers/PrivyProvider";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppPrivyProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppPrivyProvider>
  </React.StrictMode>
);
