export function AiRecap({ message }: { message: string }) {
  return (
    <section className="rounded-3xl border border-brand bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-dark">AI Assistant</p>
        <p className="text-lg leading-relaxed text-slate-700">{message}</p>
        <button
          type="button"
          className="self-start rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand.dark"
        >
          Ask for suggestions
        </button>
      </div>
    </section>
  );
}
