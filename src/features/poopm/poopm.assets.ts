import type { StaticImageData } from "next/image";

import bodyBanana from "./assets/body-banana.png";
import bodyCurry from "./assets/body-curry.png";
import bodyGold from "./assets/body-gold.png";
import bodyMeat from "./assets/body-meat.png";
import bodyNormal from "./assets/body-normal.png";
import bodySpicy from "./assets/body-spicy.png";
import bodyVegetable from "./assets/body-vegetable.png";
import bodyYogurt from "./assets/body-yogurt.png";
import eyesKiriri from "./assets/eyes-kiriri.png";
import eyesLashes from "./assets/eyes-lashes.png";
import eyesNikkori from "./assets/eyes-nikkori.png";
import headAhoge from "./assets/head-ahoge.png";
import headChef from "./assets/head-chef.png";
import headFruit from "./assets/head-fruit.png";
import headSilkHat from "./assets/head-silk-hat.png";
import headSprout from "./assets/head-sprout.png";
import headWave from "./assets/head-wave.png";
import limbs from "./assets/limbs.png";
import mouthHe from "./assets/mouth-he.png";
import mouthTeeth from "./assets/mouth-teeth.png";
import mouthTongue from "./assets/mouth-tongue.png";

import type {
  BodyColorId,
  EyeId,
  HeadId,
  MouthId,
} from "@/features/poopm/poopm.types";

export const LIMBS_PNG = limbs;

export const BODY_PNG: Record<BodyColorId, StaticImageData> = {
  normal: bodyNormal,
  gold: bodyGold,
  curry: bodyCurry,
  vegetable: bodyVegetable,
  spicy: bodySpicy,
  meat: bodyMeat,
  banana: bodyBanana,
  yogurt: bodyYogurt,
};

export const HEAD_PNG: Record<HeadId, StaticImageData> = {
  "silk-hat": headSilkHat,
  fruit: headFruit,
  chef: headChef,
  ahoge: headAhoge,
  sprout: headSprout,
  wave: headWave,
};

export const EYES_PNG: Record<EyeId, StaticImageData> = {
  kiriri: eyesKiriri,
  nikkori: eyesNikkori,
  lashes: eyesLashes,
};

export const MOUTH_PNG: Record<MouthId, StaticImageData> = {
  tongue: mouthTongue,
  he: mouthHe,
  teeth: mouthTeeth,
};
