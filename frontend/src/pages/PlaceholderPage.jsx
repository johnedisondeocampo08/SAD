
function PlaceholderPage({ title }) {
  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold text-white">
        {title}
      </h1>

      <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold text-white">
          {title} Management
        </h2>

        <p className="mt-3 text-slate-400">
          This module is under development.
        </p>
      </div>
    </div>
  );
}

export default PlaceholderPage;
