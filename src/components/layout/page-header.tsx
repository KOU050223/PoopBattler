type PageHeaderProps = {
  title: string;
  description?: string;
};

/** 各画面の見出し。文言は呼び出し側の画面が持つ。 */
export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{title}</h1>
      {description && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      )}
    </header>
  );
}
