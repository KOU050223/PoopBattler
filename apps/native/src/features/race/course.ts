import { COURSE, MINI_GAMES, TERRAINS } from "./config";
import { createRng, pick, shuffle, type Rng } from "./rng";
import type { Course, CoursePoint, CourseSection, MiniGame, SectionKind, Terrain } from "./types";

interface PieceOptions {
  kind: SectionKind;
  zone?: MiniGame;
  zoneIndex?: number;
  terrain?: Terrain;
  /** S字の左右。区間ごとに反転させる */
  turnSign?: 1 | -1;
}

/** 0〜1 をなだらかに 0〜1 へ（両端で傾きが 0） */
function smooth(ratio: number): number {
  const clamped = Math.min(1, Math.max(0, ratio));
  return clamped * clamped * (3 - 2 * clamped);
}

/** 区間内の i 番目の点の曲率・高さ・道幅 */
function shapeAt(index: number, length: number, options: PieceOptions) {
  let curvature = 0;
  let height = 0;
  let width: number = COURSE.roadWidth;
  const phase = (2 * Math.PI * index) / COURSE.terrainWaveLength;

  if (options.zone === "swipe") {
    const amplitude = COURSE.swipeAmplitude * ((2 * Math.PI) / COURSE.swipeWaveLength);
    curvature = amplitude * Math.cos((2 * Math.PI * index) / COURSE.swipeWaveLength);
  }
  if (options.terrain === "uphill") {
    height = COURSE.hillHeight * Math.sin(phase / 2) ** 2;
  }
  if (options.terrain === "snake") {
    const amplitude = COURSE.snakeAmplitude * ((2 * Math.PI) / COURSE.terrainWaveLength);
    curvature = amplitude * Math.cos(phase) * (options.turnSign ?? 1);
  }
  if (options.zone === "bridge") {
    const ramp = smooth(Math.min(index, length - index) / COURSE.bridgeRampLength);
    height = COURSE.bridgeHeight * ramp;
    width = COURSE.roadWidth - (COURSE.roadWidth - COURSE.bridgeWidth) * ramp;
  }
  return { curvature, height, width };
}

/** 向きの累積から x/z を積分して 1m ずつ点を足す */
class CourseBuilder {
  readonly points: CoursePoint[] = [];
  readonly sections: CourseSection[] = [];
  private x = 0;
  private z = 0;
  private heading = 0;

  get length(): number {
    return this.points.length;
  }

  addPiece(length: number, options: PieceOptions): CourseSection {
    const section: CourseSection = {
      kind: options.kind,
      startS: this.length,
      length,
      zone: options.zone,
      zoneIndex: options.zoneIndex,
      terrain: options.terrain,
    };
    for (let index = 0; index < length; index++) {
      const { curvature, height, width } = shapeAt(index, length, options);
      this.heading += curvature;
      this.points.push({
        x: this.x,
        z: this.z,
        y: height,
        h: this.heading,
        k: curvature,
        w: width,
        s: this.length,
        kind: options.kind,
        zone: options.zone,
        zoneIndex: options.zoneIndex,
        terrain: options.terrain,
      });
      this.x += Math.cos(this.heading);
      this.z += Math.sin(this.heading);
    }
    this.sections.push(section);
    return section;
  }
}

/**
 * 乱数は rng からだけ引く。引く順番（地形 → ミニゲーム → 最後の地形）を変えると、
 * 同じシードでも別のコースになるので注意
 */
export function generateCourse(rng: Rng): Course {
  const builder = new CourseBuilder();
  const hurdles: Course["hurdles"] = [];

  builder.addPiece(COURSE.startLength, { kind: "start" });

  // 見るだけの区間は、直線・上り坂・S字を1回ずつ。最後の区間だけランダム
  const terrains = [...shuffle(rng, TERRAINS), pick(rng, TERRAINS)];
  const watchLengths = [...COURSE.watchLengths, COURSE.finalWatchLength];
  const addWatch = (watchIndex: number) =>
    builder.addPiece(watchLengths[watchIndex], {
      kind: "watch",
      terrain: terrains[watchIndex],
      turnSign: watchIndex % 2 ? -1 : 1,
    });

  shuffle(rng, MINI_GAMES)
    .slice(0, COURSE.zonesPerRace)
    .forEach((zone, zoneIndex) => {
      addWatch(zoneIndex);
      const section = builder.addPiece(COURSE.zoneLength, { kind: "zone", zone, zoneIndex });
      if (zone === "hurdle") {
        for (const ratio of COURSE.hurdleRatios) {
          hurdles.push({ s: section.startS + COURSE.zoneLength * ratio, zoneIndex });
        }
      }
    });
  addWatch(COURSE.zonesPerRace);

  return {
    points: builder.points,
    sections: builder.sections,
    hurdles,
    finishS: builder.length - COURSE.finishBeforeEnd,
  };
}

export function generateCourseFromSeed(seed: number): Course {
  return generateCourse(createRng(seed));
}
