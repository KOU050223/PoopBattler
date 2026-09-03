"use server";

import { createClient } from "@/lib/supabase/server";

import {
  SIGNED_OUT_ACCOUNT_STATUS,
  toAccountStatus,
  type AccountStatus,
} from "./account.types";

/**
 * 現在のユーザーが匿名のままか、Google と連携済みかを返す。
 * 昇格の導線を出すかどうかと、データ消失の警告を出すかどうかがこれで決まる。
 */
export async function getAccountStatusAction(): Promise<AccountStatus> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return SIGNED_OUT_ACCOUNT_STATUS;

  return toAccountStatus(user);
}
