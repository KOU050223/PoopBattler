import type { SupabaseClient } from "@supabase/supabase-js";

type Result = { data: unknown; error: { message: string } | null };

/** from(table) の連鎖を記録し、await / single / maybeSingle で渡された結果を返す最小のモック。 */
export function mockSupabase(options: {
  user?: { id: string } | null;
  authError?: { message: string } | null;
  result?: Result;
}) {
  const calls: { table: string; ops: [string, unknown[]][] }[] = [];
  const result = options.result ?? { data: null, error: null };

  const from = (table: string) => {
    const call = { table, ops: [] as [string, unknown[]][] };
    calls.push(call);
    const chain: Record<string, unknown> = {};
    for (const op of ["select", "insert", "update", "delete", "eq", "order"]) {
      chain[op] = (...args: unknown[]) => {
        call.ops.push([op, args]);
        return chain;
      };
    }
    chain.single = async () => result;
    chain.maybeSingle = async () => result;
    chain.then = (resolve: (value: Result) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject);
    return chain;
  };

  const client = {
    auth: {
      getUser: async () => ({
        data: { user: options.user === undefined ? { id: "user-1" } : options.user },
        error: options.authError ?? null,
      }),
    },
    from,
  } as unknown as SupabaseClient;
  return { client, calls };
}
