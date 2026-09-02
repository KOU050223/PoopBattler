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

// IndexedDBの接続は open した側が必ず close する責任を負うが、その漏れは
// 静的解析では追えない（経路ごとの実行時の振る舞いであり、ESLintはデータ
// フローを持たない）。代わりに「open を書ける場所」を1つに閉じ込め、
// 接続管理のコピーが別ファイルに増える経路だけを塞ぐ。
// 解放漏れ自体は meal-photo-storage.connection.test.ts が3経路で検証する。
const indexedDbMessage =
  "IndexedDBの接続は features/meal/meal-photo-storage.ts の runTransaction 経由で扱う（接続の解放を1か所に閉じ込めるため）。";

const restrictedIndexedDb = {
  // グローバルの indexedDB でも window.indexedDB でも捕まえる。
  selector:
    "MemberExpression[property.name='open'][object.name='indexedDB'], MemberExpression[property.name='open'][object.property.name='indexedDB']",
  message: indexedDbMessage,
};

// IndexedDBの接続を生成してよい場所。拡張子は上の許可リストと同じ範囲を取る。
const indexedDbAllowlist = [
  "src/features/meal/meal-photo-storage.{ts,mts}",
];

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
      "no-restricted-syntax": [
        "error",
        restrictedDynamicImport,
        restrictedIndexedDb,
      ],
    },
  },
  {
    // 許可リスト。禁止ブロックより後に置くことで解除が効く。
    // no-restricted-syntax を "off" にすると IndexedDB ルールまで一緒に
    // 外れるため、解除ではなく「動的importルールを外した再指定」にする。
    files: supabaseClientAllowlist,
    rules: {
      "no-restricted-imports": "off",
      "no-restricted-syntax": ["error", restrictedIndexedDb],
    },
  },
  {
    // IndexedDBの接続管理を許す場所。ここでも Supabase 側のルールは残す。
    files: indexedDbAllowlist,
    rules: {
      "no-restricted-syntax": ["error", restrictedDynamicImport],
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
