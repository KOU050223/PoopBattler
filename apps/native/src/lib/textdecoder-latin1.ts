// Expo の winter TextDecoder は UTF-8 専用で、それ以外のラベルは
// RangeError("Unknown encoding") になる。fast-png はモジュール初期化で
// `new TextDecoder("latin1")` を実行するため、import した時点でアプリが落ちる。
// latin1(ISO-8859-1)は「バイト値 = コードポイント」なので薄い実装で被せ、
// それ以外のラベルは元の実装へ委譲する。index.ts の最初で import すること。

const OriginalTextDecoder = globalThis.TextDecoder;

// fast-png が要求するのは "latin1" のみだが、ISO-8859-1 の一般的な別名も拾う。
const LATIN1_LABELS = new Set([
  "latin1",
  "latin-1",
  "l1",
  "iso-8859-1",
  "iso8859-1",
  "iso88591",
  "iso_8859-1",
  "iso_8859-1:1987",
  "csisolatin1",
]);

const HERMES_APPLY_LIMIT = 4096;

class CompatTextDecoder {
  private readonly inner?: InstanceType<typeof OriginalTextDecoder>;

  constructor(label: string = "utf-8", options: { fatal?: boolean; ignoreBOM?: boolean } = {}) {
    const normalized = String(label).trim().toLowerCase();
    if (!LATIN1_LABELS.has(normalized)) {
      this.inner = new OriginalTextDecoder(label, options);
    }
  }

  get encoding(): string {
    return this.inner ? this.inner.encoding : "latin1";
  }

  get fatal(): boolean {
    return this.inner ? this.inner.fatal : false;
  }

  get ignoreBOM(): boolean {
    return this.inner ? this.inner.ignoreBOM : false;
  }

  decode(input?: ArrayBuffer | ArrayBufferView, options?: { stream?: boolean }): string {
    if (this.inner) {
      return this.inner.decode(input, options);
    }
    if (input === undefined) {
      return "";
    }
    const bytes =
      input instanceof Uint8Array
        ? input
        : ArrayBuffer.isView(input)
          ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
          : new Uint8Array(input as ArrayBuffer);
    // latin1 はステートレスなので stream 指定は無視してよい。
    let out = "";
    for (let i = 0; i < bytes.length; i += HERMES_APPLY_LIMIT) {
      out += String.fromCharCode.apply(
        null,
        bytes.subarray(i, i + HERMES_APPLY_LIMIT) as unknown as number[],
      );
    }
    return out;
  }
}

globalThis.TextDecoder = CompatTextDecoder as unknown as typeof TextDecoder;
