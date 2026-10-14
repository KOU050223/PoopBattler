import { createElement } from "react";
import {
  createRoot,
  extend,
  type Catalogue,
  type ReconcilerRoot,
} from "@react-three/fiber";
import * as THREE from "three";

import type { Poopm3DAppearance } from "@/features/poopm-3d/components/poopm-3d-model";
import type { Poopm3DMotionRequest } from "@/features/poopm-3d/components/poopm-3d-model";
import { Poopm3DSoloScene } from "@/features/poopm-3d/components/poopm-3d-solo";

export type FigureCanvasRequest = {
  appearance: Poopm3DAppearance;
  motion: Poopm3DMotionRequest;
};

// <Canvas> コンポーネント側でやっている THREE カタログ登録を
// createRoot 経路でも必要とするため、ここで行う。
// THREE名前空間は非コンストラクタ（UniformsUtils等）を含むためキャストする。
extend(THREE as unknown as Catalogue);

// ブラウザの WebGL コンテキスト上限（〜16個）に対して、ページ内の他のCanvas
// （バトルステージ・ガチャAR等）の分を残して取れる上限。
const POOL_MAX = 10;
// 待機クレームがこの距離差以上近ければ最遠スロットを奪う（境界での奪い合い揺れ防止）。
const STEAL_MARGIN_PX = 40;

type Slot = {
  el: HTMLCanvasElement;
  root: ReconcilerRoot<HTMLCanvasElement>;
  store: ReturnType<ReconcilerRoot<HTMLCanvasElement>["render"]> | null;
  observer: ResizeObserver;
  host: HTMLElement | null;
};

const free: Slot[] = [];
const assigned = new Map<HTMLElement, Slot>();
// 画面近くにあるがスロットを得られていないホスト。claim を解除されると消える。
const waiting = new Map<HTMLElement, FigureCanvasRequest>();
let created = 0;

function distanceToViewport(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const center = rect.top + rect.height / 2;
  return Math.abs(center - window.innerHeight / 2);
}

function render(slot: Slot, request: FigureCanvasRequest) {
  slot.store = slot.root.render(
    createElement(Poopm3DSoloScene, {
      appearance: request.appearance,
      motion: request.motion,
    }),
  );
}

function createSlot(): Slot {
  const el = document.createElement("canvas");
  // PoopmFigure3D の `div[aria-hidden].absolute.inset-0` と同じ位置取り。
  // タップはカードの button へ素通しさせる。
  el.style.position = "absolute";
  el.style.inset = "0";
  el.style.width = "100%";
  el.style.height = "100%";
  el.style.pointerEvents = "none";
  el.setAttribute("aria-hidden", "true");
  const root = createRoot(el);
  const slot: Slot = {
    el,
    root,
    store: null,
    // createRoot 経路には <Canvas> の useMeasure が無いので、
    // 割り当て中のリサイズ（画面回転など）はここで store.setSize する。
    observer: new ResizeObserver((entries) => {
      if (!slot.store || !slot.host) return;
      const rect = entries[0]?.contentRect;
      if (!rect || rect.width === 0 || rect.height === 0) return;
      slot.store.getState().setSize(rect.width, rect.height);
    }),
    host: null,
  };
  slot.observer.observe(el);
  void root.configure({
    camera: { position: [0, 0.7, 6.6], fov: 30 },
    gl: { antialias: true, alpha: true },
    dpr: [1, 2],
    frameloop: "always",
  });
  created += 1;
  return slot;
}

function attach(slot: Slot, host: HTMLElement, request: FigureCanvasRequest) {
  host.appendChild(slot.el);
  slot.host = host;
  assigned.set(host, slot);
  waiting.delete(host);
  void slot.root.configure({ frameloop: "always" });
  render(slot, request);
}

function detach(host: HTMLElement) {
  const slot = assigned.get(host);
  if (!slot) return;
  assigned.delete(host);
  if (slot.el.parentNode === host) host.removeChild(slot.el);
  slot.host = null;
  // 画面外でも描き続けないようループを止める（コンテキストは生かす）。
  void slot.root.configure({ frameloop: "never" });
  free.push(slot);
}

function nearestWaiting(): [HTMLElement, FigureCanvasRequest] | null {
  let best: [HTMLElement, FigureCanvasRequest] | null = null;
  let bestDist = Infinity;
  for (const [host, request] of waiting) {
    if (!host.isConnected) continue;
    const dist = distanceToViewport(host);
    if (dist < bestDist) {
      bestDist = dist;
      best = [host, request];
    }
  }
  return best;
}

function furthestAssigned(): { host: HTMLElement; dist: number } | null {
  let worst: { host: HTMLElement; dist: number } | null = null;
  for (const [host] of assigned) {
    if (!host.isConnected) continue;
    const dist = distanceToViewport(host);
    if (!worst || dist > worst.dist) worst = { host, dist };
  }
  return worst;
}

function reconcile() {
  // Reactのcleanupで必ずreleaseされるはずだが、DOMから外れた
  // ホストが残った場合にスロットがリークしないよう回収する。
  for (const [host] of assigned) {
    if (!host.isConnected) detach(host);
  }
  for (const [host] of waiting) {
    if (!host.isConnected) {
      waiting.delete(host);
      lastRequests.delete(host);
    }
  }

  // 空きスロットを viewport に近い待機クレームから順に割り当てる。
  for (;;) {
    const next = nearestWaiting();
    if (!next) return;
    const slot = free.pop() ?? (created < POOL_MAX ? createSlot() : null);
    if (!slot) break;
    attach(slot, next[0], next[1]);
  }

  // 満杯時は、明らかに近い待機クレームがあれば最遠スロットを奪う。
  // 奪われた側のクレームは再び waiting に戻るだけで、離れた場所なので
  // 画面内の表示は基本的に欠けない。
  for (;;) {
    const next = nearestWaiting();
    const worst = furthestAssigned();
    if (!next || !worst) return;
    if (distanceToViewport(next[0]) + STEAL_MARGIN_PX >= worst.dist) return;
    const req = lastRequests.get(worst.host);
    detach(worst.host);
    if (req) waiting.set(worst.host, req);
    const slot = free.pop();
    if (slot) attach(slot, next[0], next[1]);
  }
}

// 奪取時に被害側へ再描画用の要求を残すための最終要求メモ。
const lastRequests = new Map<HTMLElement, FigureCanvasRequest>();

/**
 * フィギュア表示枠（host）に WebGL canvas を割り当てる。
 *
 * 図鑑のように多数並ぶ画面では、1枠=1Canvas の素直な実装だと
 * スクロールのたびにコンテキストを作り捨てになる。WebKit は
 * loseContext してもコンテキストを解放しないため、上限超過で
 * 表示中の Canvas が強制ロストして白抜きになる（WebKit #218305）。
 * そのため canvas 要素ごとプールし、枠間で移動して使い回す。
 * 返り値の関数を呼ぶと割り当てを解放する。
 */
export function claimFigureCanvas(
  host: HTMLElement,
  request: FigureCanvasRequest,
): () => void {
  lastRequests.set(host, request);
  const slot = assigned.get(host);
  if (slot) {
    render(slot, request);
  } else {
    waiting.set(host, request);
  }
  reconcile();

  return () => {
    lastRequests.delete(host);
    waiting.delete(host);
    detach(host);
    reconcile();
  };
}
