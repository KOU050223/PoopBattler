import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BarChart } from "./bar-chart";
import { ShareBar } from "./share-bar";
import { TrendLine } from "./trend-line";

/**
 * 図はすべて最大値や合計で割って長さを決める。全部0の週はその割り算が
 * 0除算になり、「棒が短い」ではなく「壊れる」側に倒れる。
 * 落ちるべき側（0件）と通るべき側（記録あり）を、同じ節で並べて見る。
 */
describe("BarChart", () => {
  it("記録があれば棒と値を描く", () => {
    const markup = renderToStaticMarkup(
      <BarChart bars={[{ label: "1", value: 1 }, { label: "2", value: 3 }]} ariaLabel="硬さ" emptyLabel="記録なし" />,
    );

    expect(markup).toContain('aria-label="硬さ"');
    expect(markup).toContain("height:100%");
    expect(markup).toContain(">3<");
    expect(markup).not.toContain("記録なし");
  });

  it("全部0なら棒を描かず「記録なし」に落とす", () => {
    const markup = renderToStaticMarkup(
      <BarChart bars={[{ label: "1", value: 0 }, { label: "2", value: 0 }]} ariaLabel="硬さ" emptyLabel="記録なし" />,
    );

    expect(markup).toContain("記録なし");
    expect(markup).not.toContain("<ol");
    expect(markup).not.toContain("NaN");
  });

  it("3から5の帯だけ色を変える", () => {
    const markup = renderToStaticMarkup(
      <BarChart
        bars={[{ label: "1", value: 1 }, { label: "3", value: 1, highlighted: true }]}
        ariaLabel="硬さ"
        emptyLabel="記録なし"
      />,
    );

    expect(markup).toContain("bg-flush-pink");
    expect(markup).toContain("bg-flush-edge");
  });
});

describe("ShareBar", () => {
  it("割合と件数の両方をテキストで持つ", () => {
    const markup = renderToStaticMarkup(
      <ShareBar
        ariaLabel="量"
        emptyLabel="記録なし"
        segments={[
          { key: "small", label: "少ない", value: 1, color: "#111111" },
          { key: "large", label: "多い", value: 3, color: "#222222" },
        ]}
      />,
    );

    expect(markup).toContain("width:25%");
    expect(markup).toContain("width:75%");
    expect(markup).toContain("(25%)");
    expect(markup).toContain("少ない");
  });

  it("合計0なら帯を描かない", () => {
    const markup = renderToStaticMarkup(
      <ShareBar
        ariaLabel="量"
        emptyLabel="記録なし"
        segments={[{ key: "small", label: "少ない", value: 0, color: "#111111" }]}
      />,
    );

    expect(markup).toContain("記録なし");
    expect(markup).not.toContain('role="img"');
    expect(markup).not.toContain("NaN");
  });
});

describe("TrendLine", () => {
  it("折れ線と各週の値を描く", () => {
    const markup = renderToStaticMarkup(
      <TrendLine
        ariaLabel="4週間の推移"
        emptyLabel="記録なし"
        points={[
          { key: "a", label: "1週", value: 2 },
          { key: "b", label: "2週", value: 4, caption: "平均 4.0" },
        ]}
      />,
    );

    expect(markup).toContain("<polyline");
    expect(markup).toContain("平均 4.0");
    expect(markup).not.toContain("NaN");
  });

  it("すべて0なら線を描かない", () => {
    const markup = renderToStaticMarkup(
      <TrendLine
        ariaLabel="4週間の推移"
        emptyLabel="記録なし"
        points={[{ key: "a", label: "1週", value: 0 }]}
      />,
    );

    expect(markup).toContain("記録なし");
    expect(markup).not.toContain("<polyline");
  });

  it("点が無くても壊れない", () => {
    const markup = renderToStaticMarkup(
      <TrendLine ariaLabel="4週間の推移" emptyLabel="記録なし" points={[]} />,
    );

    expect(markup).toContain("記録なし");
    expect(markup).not.toContain("NaN");
  });
});
