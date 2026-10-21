import { appearanceForCharacter, type PoopmAppearance } from "@/features/battle/poopm-appearance";

// 力士(Species.id) → うんちくんの見た目。キャラ側の登録済み外観を流用し、新しい見た目は作らない。
// ganko は試作で最も暗い茶色の力士なので、いちばん暗い meat-poop に寄せている
const CHARACTER_IDS: Record<string, string> = {
  curry: "curry-poop",
  banana: "banana-poop",
  ganko: "meat-poop",
};

export function appearanceOfSpecies(speciesId: string): PoopmAppearance {
  return appearanceForCharacter(CHARACTER_IDS[speciesId] ?? "normal-poop");
}
