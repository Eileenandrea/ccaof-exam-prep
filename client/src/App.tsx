import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { DomainsProvider } from "./lib/DomainsContext";
import HomePage from "./pages/HomePage";
import ExamPage from "./pages/ExamPage";
import ResultsPage from "./pages/ResultsPage";
import DashboardPage from "./pages/DashboardPage";
import FlashcardsPage from "./pages/FlashcardsPage";
import AboutPage from "./pages/AboutPage";

export default function App() {
  return (
    <DomainsProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-50 flex flex-col">
          <nav className="border-b border-slate-200 bg-white px-4 sm:px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
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
          <main className="flex-1 px-4 sm:px-6 py-8">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/exam/:id" element={<ExamPage />} />
              <Route path="/results/:id" element={<ResultsPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/flashcards" element={<FlashcardsPage />} />
              <Route path="/about" element={<AboutPage />} />
            </Routes>
          </main>
          <footer className="border-t border-slate-200 bg-white px-4 sm:px-6 py-3 text-center text-xs text-slate-400">
            Personal study tool, not affiliated with or endorsed by Anthropic. Questions are
            original, not real/leaked exam content.{" "}
            <Link to="/about" className="underline hover:text-slate-600">
              Learn more
            </Link>
          </footer>
        </div>
      </BrowserRouter>
    </DomainsProvider>
  );
}
