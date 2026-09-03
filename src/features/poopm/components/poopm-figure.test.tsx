import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PoopmFigure } from "./poopm-figure";
import type { PoopmAppearance } from "../poopm.types";

const APPEARANCE: PoopmAppearance = {
  head: "hat-a",
  eyes: "eye-a",
  mouth: "mouth-a",
  color: "a",
};

describe("PoopmFigure", () => {
  it("前向きは胴体、手足、頭、口、目の順で重ねる", () => {
    const markup = renderToStaticMarkup(
      <PoopmFigure appearance={APPEARANCE} facing="front" motion="idle" />,
    );

    const body = markup.indexOf("/body/poopm_body_a.png");
    const limbs = markup.indexOf("/legs/poopm_base_rightleg.png");
    const head = markup.indexOf("/hat/poopm_hat_a.png");
    const mouth = markup.indexOf("/mouth/poopm_mouth_a.png");
    const eyes = markup.indexOf("/eyes/poopm_eye_a.png");

    expect(body).toBeGreaterThanOrEqual(0);
    expect(body).toBeLessThan(limbs);
    expect(limbs).toBeLessThan(head);
    expect(head).toBeLessThan(mouth);
    expect(mouth).toBeLessThan(eyes);
  });

  it("画面左には右側パーツ、画面右には左側パーツを置く", () => {
    const markup = renderToStaticMarkup(
      <PoopmFigure appearance={APPEARANCE} facing="front" motion="idle" />,
    );

    expect(markup.indexOf("/legs/poopm_base_rightleg.png")).toBeLessThan(
      markup.indexOf("/legs/poopm_base_leftleg.png"),
    );
    expect(markup.indexOf("/hands/poopm_base_righthand.png")).toBeLessThan(
      markup.indexOf("/hands/poopm_base_lefthand.png"),
    );
  });

  it("後ろ向きは目と口を出さず、頭は残す", () => {
    const markup = renderToStaticMarkup(
      <PoopmFigure appearance={APPEARANCE} facing="back" motion="idle" />,
    );

    expect(markup).toContain("/body/poopm_body_a.png");
    expect(markup).toContain("/hat/poopm_hat_a.png");
    expect(markup).not.toContain("/eyes/poopm_eye_a.png");
    expect(markup).not.toContain("/mouth/poopm_mouth_a.png");
  });
});
