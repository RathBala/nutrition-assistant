export type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-dark">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">{description}</p>
      </div>
    </header>
  );
}
