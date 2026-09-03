import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { DomainsProvider } from "./lib/DomainsContext";
import HomePage from "./pages/HomePage";
import ExamPage from "./pages/ExamPage";
import ResultsPage from "./pages/ResultsPage";
import DashboardPage from "./pages/DashboardPage";
import PlaceholderPage from "./pages/PlaceholderPage";

export default function App() {
  return (
    <DomainsProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-50">
          <nav className="border-b border-slate-200 bg-white px-6 py-3 flex items-center gap-6">
            <Link to="/" className="font-semibold text-slate-800">
              CCAO-F Prep
            </Link>
            <Link to="/dashboard" className="text-sm text-slate-500 hover:text-slate-800">
              Dashboard
            </Link>
            <Link to="/flashcards" className="text-sm text-slate-500 hover:text-slate-800">
              Flashcards
            </Link>
            <Link to="/about" className="text-sm text-slate-500 hover:text-slate-800">
              About
            </Link>
          </nav>
          <main className="px-6 py-8">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/exam/:id" element={<ExamPage />} />
              <Route path="/results/:id" element={<ResultsPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route
                path="/flashcards"
                element={
                  <PlaceholderPage title="Flashcards" note="Coming in Phase 5." />
                }
              />
              <Route
                path="/about"
                element={<PlaceholderPage title="About" note="Coming in Phase 7." />}
              />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </DomainsProvider>
  );
}
