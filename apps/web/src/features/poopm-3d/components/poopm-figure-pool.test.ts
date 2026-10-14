import { beforeEach, describe, expect, it, vi } from "vitest";

// DOM非依存のユニットテスト。document/window/ResizeObserver と
// @react-three/fiber の createRoot をスタブし、
// claim/release/上限/奪取の割り当てロジックだけを検証する。

const createdRoots: Array<{
  configure: ReturnType<typeof vi.fn>;
  render: ReturnType<typeof vi.fn>;
  unmount: ReturnType<typeof vi.fn>;
}> = [];

vi.mock("@react-three/fiber", () => ({
  extend: vi.fn(),
  createRoot: () => {
    const root = {
      configure: vi.fn(async () => root),
      render: vi.fn(() => ({ getState: () => ({ setSize: vi.fn() }) })),
      unmount: vi.fn(),
    };
    createdRoots.push(root);
    return root;
  },
}));

vi.mock("@/features/poopm-3d/components/poopm-3d-solo", () => ({
  Poopm3DSoloScene: () => null,
}));

type FakeEl = {
  style: Record<string, string>;
  parentNode: FakeEl | null;
  children: FakeEl[];
  isConnected: boolean;
  top: number;
  setAttribute: () => void;
  appendChild: (child: FakeEl) => void;
  removeChild: (child: FakeEl) => void;
  getBoundingClientRect: () => { top: number; height: number };
};

function makeEl(top: number): FakeEl {
  const el: FakeEl = {
    style: {},
    parentNode: null,
    children: [],
    isConnected: true,
    top,
    setAttribute() {},
    appendChild(child) {
      child.parentNode = el;
      el.children.push(child);
    },
    removeChild(child) {
      child.parentNode = null;
      el.children = el.children.filter((c) => c !== child);
    },
    getBoundingClientRect() {
      return { top: el.top, height: 100 };
    },
  };
  return el;
}

const createdCanvases: FakeEl[] = [];

beforeEach(() => {
  createdRoots.length = 0;
  createdCanvases.length = 0;
  vi.stubGlobal("document", {
    createElement: () => {
      const el = makeEl(0);
      createdCanvases.push(el);
      return el;
    },
  });
  vi.stubGlobal("window", { innerHeight: 1000 });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

const APPEARANCE = {
  color: "orange",
  eyes: "eye-g",
  mouth: "mouth-g",
  head: "hat-c",
} as const;
const REQUEST = {
  appearance: APPEARANCE,
  motion: { name: "idle", nonce: 0 },
} as const;

async function importPool() {
  vi.resetModules();
  const pool = await import(
    "@/features/poopm-3d/components/poopm-figure-pool"
  );
  return pool;
}

// viewport 高さ1000・中心500、ホスト高さ100 → 中心 top+50。
// dist = |top - 450|
describe("poopm-figure-pool", () => {
  it("claimでcanvasがホストに装着され、解放で外れて再利用される", async () => {
    const pool = await importPool();
    const host = makeEl(450) as unknown as HTMLElement;
    const release = pool.claimFigureCanvas(host, REQUEST);

    expect(host.children).toHaveLength(1);
    expect(createdCanvases).toHaveLength(1);
    expect(createdRoots[0]!.render).toHaveBeenCalledTimes(1);
    const element = createdRoots[0]!.render.mock.calls[0]![0];
    expect(element.props.appearance).toBe(APPEARANCE);
    expect(element.props.motion).toEqual({ name: "idle", nonce: 0 });

    release();
    expect(host.children).toHaveLength(0);

    // 別ホストでclaimすると同じcanvasが再利用される（新規生成されない）
    const host2 = makeEl(450) as unknown as HTMLElement;
    const release2 = pool.claimFigureCanvas(host2, REQUEST);
    expect(createdCanvases).toHaveLength(1);
    expect(host2.children[0]).toBe(createdCanvases[0]);
    release2();
  });

  it("同時割り当ては上限10個で打ち止めになり、遠いclaimは待機する", async () => {
    const pool = await importPool();
    const releases: Array<() => void> = [];
    const hosts: FakeEl[] = [];

    // 近い順に12個claim（dist 0, 10, 20, ...）
    for (let i = 0; i < 12; i += 1) {
      const host = makeEl(450 - i * 20);
      hosts.push(host);
      releases.push(pool.claimFigureCanvas(host as unknown as HTMLElement, REQUEST));
    }

    // canvasは上限10個までしか作られない
    expect(createdCanvases).toHaveLength(10);
    const withCanvas = hosts.filter((h) => h.children.length === 1);
    expect(withCanvas).toHaveLength(10);
    // 最遠2つ（i=10,11）は待機
    expect(hosts[10]!.children).toHaveLength(0);
    expect(hosts[11]!.children).toHaveLength(0);

    // 割り当て済みを解放すると、待機中の最も近いclaimへ回る
    releases[0]!();
    expect(createdCanvases).toHaveLength(10);
    expect(hosts[10]!.children).toHaveLength(1);
    expect(hosts[11]!.children).toHaveLength(0);

    for (const r of releases) r();
  });

  it("満杯時に近いclaimが来ると最遠スロットを奪う", async () => {
    const pool = await importPool();
    const releases: Array<() => void> = [];
    const hosts: FakeEl[] = [];

    // 10個を dist 200..209 に配置（i が大きいほど遠い）
    for (let i = 0; i < 10; i += 1) {
      const host = makeEl(650 + i);
      hosts.push(host);
      releases.push(pool.claimFigureCanvas(host as unknown as HTMLElement, REQUEST));
    }
    expect(createdCanvases).toHaveLength(10);

    // 画面中央（dist 0）のclaimが来る → 最遠（i=9, dist 209）を奪う
    const nearHost = makeEl(450);
    releases.push(
      pool.claimFigureCanvas(nearHost as unknown as HTMLElement, REQUEST),
    );
    expect(createdCanvases).toHaveLength(10);
    expect(nearHost.children).toHaveLength(1);
    expect(hosts[9]!.children).toHaveLength(0);

    // 奪われた側がreleaseしてもcanvasは近い側に残る
    releases[9]!();
    expect(nearHost.children).toHaveLength(1);

    for (const r of releases) r();
  });

  it("遠いclaimは奪取しない（40px未満差は揺れ防止で見送り）", async () => {
    const pool = await importPool();
    const releases: Array<() => void> = [];
    const hosts: FakeEl[] = [];

    // 10個を dist 200..209 に配置（i が大きいほど遠い）
    for (let i = 0; i < 10; i += 1) {
      const host = makeEl(650 + i);
      hosts.push(host);
      releases.push(pool.claimFigureCanvas(host as unknown as HTMLElement, REQUEST));
    }

    // dist 190（最遠との差 < 40px）のclaim → 待機のまま
    const marginal = makeEl(640);
    releases.push(
      pool.claimFigureCanvas(marginal as unknown as HTMLElement, REQUEST),
    );
    expect(marginal.children).toHaveLength(0);
    expect(hosts[9]!.children).toHaveLength(1);

    for (const r of releases) r();
  });
});
