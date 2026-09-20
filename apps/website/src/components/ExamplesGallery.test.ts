import { describe, expect, test } from "bun:test";

const gallerySource = () => Bun.file(`${import.meta.dir}/ExamplesGallery.tsx`).text();

describe("examples gallery layout", () => {
  test("does not wrap the selected example in a bordered, padded panel", async () => {
    const source = await gallerySource();

    expect(source).toContain('<div className="mt-6 rounded-glow shadow-glow">');
    expect(source).not.toContain(
      '<div className="mt-6 rounded-glow border border-border p-6 shadow-glow">',
    );
  });
});
