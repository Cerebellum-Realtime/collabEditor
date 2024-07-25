import TextEditor from "./components/TextEditor";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import { v4 as uuidV4 } from "uuid";
import cerebellumLogo from "./assets/Cerebellum-transparent.png";

function App() {
  return (
    <>
      <header className="header">
        <section className="top-bar">
          <div className="logo-container">
            <img src={cerebellumLogo} alt="Cerebellum Logo" className="logo" />
            <h1 className="logo-text">Cerebellum</h1>
          </div>
        </section>
      </header>
      <Router>
        <Routes>
          <Route
            path="/"
            element={<Navigate to={`/documents/${uuidV4()}`} />}
          />
          <Route
            path="/documents"
            element={<Navigate to={`/documents/${uuidV4()}`} />}
          />
          <Route path="/documents/:id" element={<TextEditor />} />
          <Route
            path="*"
            element={<Navigate to={`/documents/${uuidV4()}`} />}
          />
        </Routes>
      </Router>
    </>
  );
}

export default App;
