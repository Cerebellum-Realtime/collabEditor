import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { cerebellumOptions, endpoint } from "./cerebellumConfig";

import { CerebellumProvider } from "@cerebellum/sdk";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <CerebellumProvider options={cerebellumOptions} endpoint={endpoint}>
    <App />
  </CerebellumProvider>
);
