import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// データアクセス境界（docs/architecture.md「責務のルール」3）を機械的に守らせる。
// 既定を「src/ 全体で禁止」にし、生成を許す場所だけを後段で解除する許可リスト方式。
// 禁止リスト方式だと、新しく増えたディレクトリが黙って穴になる。
const supabaseClientMessage =
  "Supabaseクライアントは features/<機能名>/actions.ts か lib/supabase/、proxy.ts で生成する（docs/architecture.md 参照）。";

// 静的 import 用のパターン（no-restricted-imports はグロブを解釈する）。
const restrictedImportPatterns = [
  "@/lib/supabase/client",
  "@/lib/supabase/server",
  "**/lib/supabase/client",
  "**/lib/supabase/server",
  "@supabase/ssr",
  "@supabase/supabase-js",
];

// 動的 import 用。esquery の属性比較はグロブを展開しないため、
// 上のパターンをそのまま渡すと "**/..." が literal 扱いになり素通りする。
// したがって正規表現セレクタで書き、静的側と同じ対象を1か所から導出する。
//
// 注意: esquery の正規表現リテラルは最初の `/` で終端されるため、
// `\/` によるエスケープが使えない。区切り文字は文字クラス `[/]` で表す。
const SLASH = "[/]";
const escapeRegExp = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll("/", SLASH);

const dynamicImportSources = [
  // 末尾が lib/supabase/{client,server} なら、エイリアスでも相対パスでも捕まえる。
  `(?:.*${SLASH})?lib${SLASH}supabase${SLASH}(?:client|server)`,
  escapeRegExp("@supabase/ssr"),
  escapeRegExp("@supabase/supabase-js"),
];

const restrictedDynamicImport = {
  selector: `ImportExpression[source.value=/^(?:${dynamicImportSources.join("|")})$/]`,
  message: supabaseClientMessage,
};

// クライアントを生成してよい場所。architecture.md が挙げるものだけを並べる。
// tsconfig が **/*.mts も include するため、拡張子の取りこぼしを作らない。
const supabaseClientAllowlist = [
  "src/features/*/actions.{ts,mts}",
  "src/lib/supabase/**/*.{ts,tsx,mts,js,jsx}",
  "src/proxy.{ts,mts}",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // tsconfig で allowJs と **/*.mts が有効なため、いずれの拡張子も対象に含める。
    files: ["src/**/*.{ts,tsx,mts,js,jsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: restrictedImportPatterns, message: supabaseClientMessage },
          ],
        },
      ],
      "no-restricted-syntax": ["error", restrictedDynamicImport],
    },
  },
  {
    // 許可リスト。禁止ブロックより後に置くことで解除が効く。
    files: supabaseClientAllowlist,
    rules: {
      "no-restricted-imports": "off",
      "no-restricted-syntax": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
