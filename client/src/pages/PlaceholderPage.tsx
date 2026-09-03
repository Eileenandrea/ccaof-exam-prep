export default function PlaceholderPage({ title, note }: { title: string; note: string }) {
  return (
    <div className="max-w-2xl mx-auto mt-16 text-center">
      <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
      <p className="mt-3 text-slate-500">{note}</p>
    </div>
  );
}
