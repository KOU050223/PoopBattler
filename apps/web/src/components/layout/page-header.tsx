type PageHeaderProps = {
  title: string;
  description?: string;
};

/** 各画面の見出し。文言は呼び出し側の画面が持つ。 */
export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-[32px] leading-[1.2] font-bold text-charcoal">{title}</h1>
      {description && (
        <p className="text-[17px] leading-[1.18] font-medium text-pencil-gray">{description}</p>
      )}
    </header>
  );
}
