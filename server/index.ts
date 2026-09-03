import express from "express";
import cors from "cors";
import { db } from "./db/db.js";
import questionsRouter from "./routes/questions.js";
import examsRouter from "./routes/exams.js";
import attemptsRouter from "./routes/attempts.js";
import dashboardRouter from "./routes/dashboard.js";
import flashcardsRouter from "./routes/flashcards.js";
import domainsRouter from "./routes/domains.js";

// Ensure schema exists even if `npm run migrate` wasn't run manually.
import "./db/migrate.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  const row = db.prepare("SELECT COUNT(*) AS count FROM questions").get() as { count: number };
  res.json({ ok: true, questionCount: row.count });
});

app.use("/api/domains", domainsRouter);
app.use("/api/questions", questionsRouter);
app.use("/api/exams", examsRouter);
app.use("/api/attempts", attemptsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/flashcards", flashcardsRouter);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(PORT, () => {
  console.log(`CCAO-F API listening on http://localhost:${PORT}`);
});
