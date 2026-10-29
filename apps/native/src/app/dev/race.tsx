import { router } from "expo-router";

import { RaceScreen } from "@/features/race/ui/RaceScreen";

/** うんちレースを1本遊べる画面。dev 専用。 */
export default function RaceDevScreen() {
  return <RaceScreen onExit={() => router.back()} />;
}
