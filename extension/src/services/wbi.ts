const MIXIN_KEY_ENC_TABLE = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 37, 12, 52, 56, 31,
  39, 11, 41, 33, 22, 4, 1, 40, 45, 20, 6, 37, 54, 47, 34, 44,
  17, 24, 13, 48, 16, 50, 21, 55, 36, 7, 30, 26,
];

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Referer: "https://www.bilibili.com/",
  Origin: "https://www.bilibili.com",
};

// WBI key cache (30 min TTL)
let wbiKeyCache: { imgKey: string; subKey: string } | null = null;
let wbiKeyExpiry = 0;

// --- Pure JS MD5 implementation ---
function md5(message: string): string {
  function md5cycle(x: number[], k: number[]) {
    let a = x[0], b = x[1], c = x[2], d = x[3];
    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);
    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);
    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);
    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);
    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);
  }
  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
  }
  function add32(a: number, b: number) {
    return (a + b) & 0xffffffff;
  }
  function md5blk(s: string) {
    const md5blks: number[] = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] =
        s.charCodeAt(i) +
        (s.charCodeAt(i + 1) << 8) +
        (s.charCodeAt(i + 2) << 16) +
        (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }
  function rhex(n: number) {
    const hex_chr = "0123456789abcdef";
    let s = "";
    for (let j = 0; j < 4; j++)
      s += hex_chr.charAt((n >> (j * 8 + 4)) & 0x0f) + hex_chr.charAt((n >> (j * 8)) & 0x0f);
    return s;
  }

  // UTF-8 encode
  const utf8: number[] = [];
  for (let i = 0; i < message.length; i++) {
    let c = message.charCodeAt(i);
    if (c < 128) utf8.push(c);
    else if (c < 2048) { utf8.push((c >> 6) | 192); utf8.push((c & 63) | 128); }
    else { utf8.push((c >> 12) | 224); utf8.push(((c >> 6) & 63) | 128); utf8.push((c & 63) | 128); }
  }
  const n = utf8.length;
  let s = "";
  for (let i = 0; i < n; i++) s += String.fromCharCode(utf8[i]);

  let state = [1732584193, -271733879, -1732584194, 271733878];
  let i = 0;
  const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (i = 0; i + 64 <= n; i += 64) md5cycle(state, md5blk(s.substring(i, i + 64)));
  s = s.substring(i);
  let tl = s.length;
  for (i = 0; i < tl; i++) tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
  tail[i >> 2] |= 0x80 << ((i % 4) << 3);
  if (i > 55) { md5cycle(state, tail); for (i = 0; i < 16; i++) tail[i] = 0; }
  tail[14] = n * 8;
  md5cycle(state, tail);
  return rhex(state[0]) + rhex(state[1]) + rhex(state[2]) + rhex(state[3]);
}
// --- End MD5 ---

export function getMixinKey(imgKey: string, subKey: string): string {
  const mixin = imgKey + subKey;
  let result = "";
  for (let i = 0; i < 32; i++) {
    const idx = MIXIN_KEY_ENC_TABLE[i];
    if (idx < mixin.length) result += mixin[idx];
  }
  return result;
}

export function signWbi(
  params: Record<string, string | number>,
  imgKey: string,
  subKey: string
): Record<string, string | number> {
  const mixinKey = getMixinKey(imgKey, subKey);

  const sortedEntries = Object.entries(params)
    .map(([k, v]) => [k, String(v)] as [string, string])
    .sort((a, b) => a[0].localeCompare(b[0]));

  const query = sortedEntries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const toSign = query + mixinKey;
  const wRid = md5(toSign);
  const wts = Math.floor(Date.now() / 1000);

  return { ...params, w_rid: wRid, wts };
}

export async function getWbiKeys(): Promise<[string, string]> {
  const now = Date.now() / 1000;
  if (wbiKeyCache && now < wbiKeyExpiry) {
    return [wbiKeyCache.imgKey, wbiKeyCache.subKey];
  }

  const resp = await fetch("https://api.bilibili.com/x/web-interface/nav", {
    headers: BROWSER_HEADERS,
    credentials: "include",
  });
  if (!resp.ok) throw new Error(`WBI nav API failed: ${resp.status}`);
  const data = await resp.json();

  const wbiImg = data?.data?.wbi_img;
  const imgUrl: string = wbiImg?.img_url || "";
  const subUrl: string = wbiImg?.sub_url || "";

  if (!imgUrl || !subUrl) throw new Error("Failed to get WBI keys");

  const imgKey = imgUrl.split("/").pop()!.split(".")[0];
  const subKey = subUrl.split("/").pop()!.split(".")[0];

  wbiKeyCache = { imgKey, subKey };
  wbiKeyExpiry = now + 1800;

  return [imgKey, subKey];
}

export { BROWSER_HEADERS };
