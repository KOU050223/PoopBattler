import { describe, expect, it } from "vitest";

import {
  diffCameraSides,
  resolveCameraCue,
  softenStageCameraCue,
  stageCameraCue,
  STAGE_ANCHOR,
  STAGE_CAMERA_WIDE,
  type StageCameraCue,
  type StageMotions,
} from "@/features/poopm-3d/poopm-3d.camera";
import type { Poopm3DBattleMotion } from "@/features/poopm-3d/poopm-3d.motion";

const IDLE_MOTIONS: StageMotions = {
  player: { name: "idle", nonce: 0 },
  enemy: { name: "idle", nonce: 0 },
};

function distance(a: readonly number[], b: readonly number[]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function mustCue(
  motion: Poopm3DBattleMotion,
  side: "player" | "enemy",
): StageCameraCue {
  const cue = stageCameraCue(motion, side);
  expect(cue).not.toBeNull();
  return cue as StageCameraCue;
}

describe("stageCameraCue", () => {
  it("idle はキューを出さない", () => {
    expect(stageCameraCue("idle", "player")).toBeNull();
    expect(stageCameraCue("idle", "enemy")).toBeNull();
  });

  it("attack: 攻撃側へ寄る1回切りのショット", () => {
    const cue = mustCue("attack", "player");
    const anchor = STAGE_ANCHOR.player.position;
    expect(distance(cue.position, anchor)).toBeLessThan(
      distance(STAGE_CAMERA_WIDE.position, anchor),
    );
    expect(cue.hold).toEqual({ kind: "timed", seconds: expect.any(Number) });
    expect(cue.source).toEqual({ side: "player", name: "attack" });
  });

  it("hit: 被弾側へ寄り + シェイク付き", () => {
    const cue = mustCue("hit", "enemy");
    expect(cue.shake).toBeGreaterThan(0);
    const anchor = STAGE_ANCHOR.enemy.position;
    expect(distance(cue.position, anchor)).toBeLessThan(
      distance(STAGE_CAMERA_WIDE.position, anchor),
    );
  });

  it("special_charge: 溜め側へ寄り、モーションが続く間保持", () => {
    const cue = mustCue("special_charge", "player");
    expect(cue.hold.kind).toBe("while");
  });

  it("special_fire: 回り込み（横へ振れる）+ ワイドより寄るズーム", () => {
    const fire = mustCue("special_fire", "player");
    const charge = mustCue("special_charge", "player");
    // 同じ側・ほぼ同じ距離でも swing で x がずれる = 回り込み
    expect(Math.abs(fire.position[0] - charge.position[0])).toBeGreaterThan(0.5);
    expect(fire.fov).toBeGreaterThan(STAGE_CAMERA_WIDE.fov);
  });

  it("ko: 低い位置から倒れた側へ寄る", () => {
    const cue = mustCue("ko", "enemy");
    expect(cue.position[1]).toBeLessThan(STAGE_CAMERA_WIDE.position[1]);
    expect(cue.hold.kind).toBe("timed");
  });

  it("win / lose は終端なので while 保持", () => {
    expect(mustCue("win", "player").hold.kind).toBe("while");
    expect(mustCue("lose", "player").hold.kind).toBe("while");
  });

  it("swap_in は交代側へパン", () => {
    const cue = mustCue("swap_in", "player");
    expect(distance(cue.position, STAGE_ANCHOR.player.position)).toBeLessThan(
      distance(STAGE_CAMERA_WIDE.position, STAGE_ANCHOR.player.position),
    );
  });

  it("優先度: 同 tick の組み合わせで意味の通る側を撮る", () => {
    // 通常交差: 攻撃側 > 被弾側
    expect(mustCue("attack", "player").priority).toBeGreaterThan(
      mustCue("hit", "enemy").priority,
    );
    // 必殺着弾: 発射 > 被弾
    expect(mustCue("special_fire", "player").priority).toBeGreaterThan(
      mustCue("hit", "enemy").priority,
    );
    // 勝利: 勝者寄り > 倒れた側。敗北: 俯瞰 > 勝者寄り。
    expect(mustCue("win", "player").priority).toBeGreaterThan(
      mustCue("ko", "enemy").priority,
    );
    expect(mustCue("lose", "player").priority).toBeGreaterThan(
      mustCue("win", "enemy").priority,
    );
  });
});

describe("diffCameraSides", () => {
  it("初回（prev=null）は両サイドを返す", () => {
    expect(diffCameraSides(null, IDLE_MOTIONS)).toEqual(["player", "enemy"]);
  });

  it("name が同じでも nonce が進んだサイドを拾う", () => {
    const next: StageMotions = {
      player: { name: "idle", nonce: 0 },
      enemy: { name: "hit", nonce: 1 },
    };
    const prev: StageMotions = {
      player: { name: "idle", nonce: 0 },
      enemy: { name: "hit", nonce: 0 },
    };
    expect(diffCameraSides(prev, next)).toEqual(["enemy"]);
  });

  it("変化なしなら空", () => {
    expect(diffCameraSides(IDLE_MOTIONS, IDLE_MOTIONS)).toEqual([]);
  });
});

describe("resolveCameraCue", () => {
  it("同時に2キュー来たら優先度の高い方を採る", () => {
    const motions: StageMotions = {
      player: { name: "attack", nonce: 1 },
      enemy: { name: "hit", nonce: 1 },
    };
    const result = resolveCameraCue(["player", "enemy"], motions, null);
    expect(result.cue?.source).toEqual({ side: "player", name: "attack" });
    expect(result.release).toBe(false);
  });

  it("キューの無い変化では現行を維持（releaseしない）", () => {
    const charge = mustCue("special_charge", "player");
    const result = resolveCameraCue(
      ["enemy"],
      { player: { name: "special_charge", nonce: 3 }, enemy: { name: "idle", nonce: 0 } },
      charge,
    );
    expect(result.cue).toBeNull();
    expect(result.release).toBe(false);
  });

  it("while キューの源モーションが終わったら release", () => {
    const charge = mustCue("special_charge", "player");
    const result = resolveCameraCue(
      ["player"],
      { player: { name: "idle", nonce: 4 }, enemy: { name: "idle", nonce: 0 } },
      charge,
    );
    expect(result.release).toBe(true);
  });

  it("timed キューはモーション終了を待たず時間で切れる（releaseしない）", () => {
    const attack = mustCue("attack", "player");
    const result = resolveCameraCue(
      ["player"],
      { player: { name: "idle", nonce: 2 }, enemy: { name: "idle", nonce: 0 } },
      attack,
    );
    expect(result.release).toBe(false);
  });
});

describe("softenStageCameraCue", () => {
  it("寄りを弱めてシェイクを消す", () => {
    const cue = mustCue("hit", "enemy");
    const soft = softenStageCameraCue(cue, 0.35);
    expect(soft.shake).toBe(0);
    const anchor = STAGE_ANCHOR.enemy.position;
    expect(distance(soft.position, anchor)).toBeGreaterThan(
      distance(cue.position, anchor),
    );
    expect(distance(soft.position, anchor)).toBeLessThan(
      distance(STAGE_CAMERA_WIDE.position, anchor),
    );
    expect(soft.fov).toBeLessThan(cue.fov);
  });
});
