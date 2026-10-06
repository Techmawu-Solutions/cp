import { test } from "node:test";
import assert from "node:assert/strict";
import { toEmbedUrl } from "@/lib/embed-url";

const YT = { url: "https://www.youtube-nocookie.com/embed/Dxcc6ycZ73M", provider: "youtube" };

test("YouTube links in every common form become the privacy-enhanced player", () => {
  for (const link of [
    "https://www.youtube.com/watch?v=Dxcc6ycZ73M",
    "https://youtube.com/watch?v=Dxcc6ycZ73M&list=PL123",
    "https://m.youtube.com/watch?v=Dxcc6ycZ73M",
    "https://youtu.be/Dxcc6ycZ73M",
    "https://www.youtube.com/shorts/Dxcc6ycZ73M",
    "https://www.youtube.com/embed/Dxcc6ycZ73M",
    "  https://www.youtube.com/watch?v=Dxcc6ycZ73M  ",
  ])
    assert.deepEqual(toEmbedUrl(link), YT, link);
  assert.equal(toEmbedUrl("https://youtu.be/Dxcc6ycZ73M?t=42").url, "https://www.youtube-nocookie.com/embed/Dxcc6ycZ73M?start=42");
});

test("an embed address keeps its provider (the cause of YouTube error 153)", () => {
  // Converting twice must not turn it into a generic page, which loses the referrer YouTube needs.
  assert.deepEqual(toEmbedUrl(toEmbedUrl("https://www.youtube.com/watch?v=Dxcc6ycZ73M").url), YT);
  assert.deepEqual(toEmbedUrl(toEmbedUrl("https://vimeo.com/22439234").url), { url: "https://player.vimeo.com/video/22439234", provider: "vimeo" });
});

test("other links are shown as they are", () => {
  assert.deepEqual(toEmbedUrl("https://en.wikipedia.org/wiki/Internet"), { url: "https://en.wikipedia.org/wiki/Internet", provider: "generic" });
  assert.equal(toEmbedUrl("https://docs.google.com/document/d/abc/edit").provider, "google");
  assert.equal(toEmbedUrl("not a url").provider, "generic");
});
