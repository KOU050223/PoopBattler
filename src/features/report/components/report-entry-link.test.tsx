import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../../messages/ja.json";

import { ReportEntryLink } from "./report-entry-link";

describe("ReportEntryLink", () => {
  it("今週のレポートへの導線を表示する", () => {
    const markup = renderToStaticMarkup(
      <NextIntlClientProvider locale="ja" messages={messages}>
        <ReportEntryLink />
      </NextIntlClientProvider>,
    );

    expect(markup).toContain('href="/report"');
    expect(markup).toContain("今週のレポート");
    expect(markup).toContain("プレミアム");
  });
});
