import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// toilet-flush.tsx は GLB 内のメッシュ名を直に参照している。モデルを差し替えたとき、
// 重複メッシュの隠し忘れ（便器が二重に描画される）に気づけるよう、構造を固定しておく。
type GltfJson = {
  nodes: { name: string; mesh: number }[];
  meshes: { name: string; primitives: { material: number; attributes: { POSITION: number } }[] }[];
  materials: { name: string }[];
  accessors: { min: number[]; max: number[] }[];
};

function readGltfJson(): GltfJson {
  const file = readFileSync(resolve(__dirname, "../../../assets/gacha/toilet.glb"));
  const jsonLength = file.readUInt32LE(12);
  return JSON.parse(file.subarray(20, 20 + jsonLength).toString("utf8")) as GltfJson;
}

describe("toilet.glb", () => {
  const gltf = readGltfJson();

  it("本体（carpetWhite の大きなメッシュ）が 2 つのノードに二重に入っている", () => {
    const bodies = gltf.meshes.flatMap((mesh) =>
      mesh.primitives
        .filter((primitive) => gltf.materials[primitive.material].name === "carpetWhite")
        .map((primitive) => ({ mesh: mesh.name, max: gltf.accessors[primitive.attributes.POSITION].max })),
    );
    const tall = bodies.filter((body) => body.max[1] > 0.4);
    expect(tall.map((body) => body.mesh).sort()).toEqual(["toiletSquare_2", "toiletSquare_3"]);
    expect(tall[0].max).toEqual(tall[1].max);
  });

  it("toilet-flush.tsx が参照するメッシュ名が、このモデルに存在する（three は 2 つ目のプリミティブに _1 を付ける）", () => {
    const meshNames = gltf.meshes.map((mesh) => mesh.name);
    expect(meshNames).toEqual(expect.arrayContaining(["toiletSquare_2", "toiletSquare_3"]));
    expect(gltf.meshes.every((mesh) => mesh.name !== "toiletSquare_3" || mesh.primitives.length === 2)).toBe(true);
    expect(gltf.nodes.map((node) => node.name)).toContain("Group");
  });
});
