export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto pb-16">
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">About this app</h1>

      <div className="space-y-5 text-slate-600 leading-relaxed">
        <p>
          This is a personal study tool for the <strong>Claude Certified Associate – Foundations
          (CCAO-F)</strong> exam. It is not a product for sale or public release — it's built for
          one person's own exam prep.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900">
          <p className="font-medium mb-1">Not affiliated with Anthropic</p>
          <p className="text-sm">
            This app is not affiliated with, endorsed by, or connected to Anthropic in any way.
            "Claude" and "Claude Certified Associate" are Anthropic's marks, referenced here only
            to describe what this tool is for.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900">
          <p className="font-medium mb-1">No real or leaked exam content</p>
          <p className="text-sm">
            Every question in this app's bank is original, hand-authored or AI-generated to match
            the publicly available CCAO-F exam blueprint (domains, task statements, and weighting).
            None of it is drawn from, based on, or claims to be an actual Anthropic exam question.
            Treat this as practice on the same topics, not as exam-question leaks.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900">
          <p className="font-medium mb-1">Scaled score is an approximation</p>
          <p className="text-sm">
            The 100–1000 scaled score shown after each exam is a simple linear approximation of
            raw percentage correct — <code className="text-xs bg-white/60 px-1 rounded">100 + (raw/60) × 900</code>,
            clamped to 100–1000. It is <em>not</em> Pearson's real scaled-scoring algorithm, which
            isn't publicly documented. Use it as a rough directional signal, not a guaranteed
            predictor of your actual exam outcome.
          </p>
        </div>

        <div>
          <p className="font-medium text-slate-700 mb-1">How the question bank grows</p>
          <p className="text-sm">
            The bank starts with a hand-authored seed set and grows over time via an offline
            generator that calls the Claude API in batches, validates every question's shape
            before it's stored, and tags each with a domain and explanation. Nothing is generated
            live during an exam — exams only ever draw from what's already in the bank.
          </p>
        </div>

        <div>
          <p className="font-medium text-slate-700 mb-1">Data & privacy</p>
          <p className="text-sm">
            All exam attempts, flashcard review state, and the question bank are stored locally in
            a SQLite file on this machine. There's no account system, no cloud sync, and nothing is
            sent anywhere except the offline generator's calls to the Claude API to add new
            questions.
          </p>
        </div>
      </div>
    </div>
  );
}
