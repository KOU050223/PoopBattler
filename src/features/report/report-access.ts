/** 決済連携前の開発環境に限り、分析画面を確認可能にする。 */
export function isReportPreviewEnabled(environment: string | undefined) {
  return environment === "development";
}
