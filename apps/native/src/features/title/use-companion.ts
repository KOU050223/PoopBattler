import { resolveLineup } from "@poopbattler/domain/records/party-lineup";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { keyValueStorage } from "@/adapters/storage";
import { collectionGateway } from "@/gateways";
import { readPartyLineup } from "@/features/collection/party-lineup-storage";

import { pickCompanion } from "./companion";

/** ホームに出す相棒の表示用データ。取得できなければ undefined（画面側が「うんちくん」を出す）。 */
export type Companion = { characterId: string; name: string };

export function useCompanion(): Companion | undefined {
  const [companion, setCompanion] = useState<Companion>();

  useFocusEffect(
    useCallback(() => {
      let isCancelled = false;
      Promise.all([collectionGateway().getCollectionCharacters(), readPartyLineup(keyValueStorage)])
        .then(([characters, stored]) => {
          if (isCancelled) return;
          const lineup = resolveLineup(stored, characters.map((character) => character.ownershipId));
          const picked = pickCompanion(characters, lineup);
          setCompanion(picked && { characterId: picked.id, name: picked.name });
        })
        .catch(() => {
          if (!isCancelled) setCompanion(undefined);
        });
      return () => {
        isCancelled = true;
      };
    }, []),
  );

  return companion;
}
