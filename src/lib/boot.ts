import type { GlyphFamily } from "@/lib/chart/glyphs";
import { FIRST_VIEW_ATTR, FIRST_VIEW_KEY, FIRST_VIEW_OVER, FIRST_VIEW_RECORD, FIRST_VIEW_TAG } from "@/lib/first-view";
import { SPACE_FLAG } from "@/lib/space/flag";

/*
 * What the page knows about the reader before anything paints, run inline at
 * the top of every page (after the theme and language scripts):
 *   - the reader's Look (colours, fonts, text size), as last applied on this
 *     device, so a custom Look never flashes from the default;
 *   - a preload of the glyph font the Look uses, so planets never show as
 *     the letters their font maps them to;
 *   - `data-returning` on <html> when charts are kept on this device (a
 *     private space, or charts from before it), so the empty "New chart"
 *     form is not the first thing a returning reader sees while the studio
 *     starts.
 * Everything is read from this device's own storage; nothing leaves it. It
 * must fail open: any error leaves the page as the server sent it.
 */

/** The Look's CSS as applied last, per theme: `ulune.boot.look.dark` / `.light`. */
export const BOOT_LOOK_KEY = "ulune.boot.look";

export type BootLook = { css: string; glyph: GlyphFamily };

/** Remember what applyLook just set on the page, for the next visit's first paint. */
export function rememberBootLook(theme: "light" | "dark", look: BootLook): void {
  try {
    window.localStorage.setItem(`${BOOT_LOOK_KEY}.${theme}`, JSON.stringify(look));
  } catch {
    /* private mode: the next visit paints the default Look first, as before */
  }
}

export function forgetBootLook(): void {
  try {
    window.localStorage.removeItem(`${BOOT_LOOK_KEY}.dark`);
    window.localStorage.removeItem(`${BOOT_LOOK_KEY}.light`);
  } catch {
    /* ignore */
  }
}

/**
 * The inline script. `glyphUrls` are the hashed font files each glyph family
 * paints with (the Noto symbols need none: they are inlined in the CSS).
 */
export function bootScript(glyphUrls: Partial<Record<GlyphFamily, string>>): string {
  const urls = JSON.stringify(glyphUrls);
  return `(function(){try{var d=document,r=d.documentElement,s=localStorage,t=r.classList.contains("light")?"light":"dark",b=s.getItem("${BOOT_LOOK_KEY}."+t),g="astronomicon";if(b){b=JSON.parse(b);if(b&&typeof b.css==="string"){r.style.cssText+=";"+b.css;if(b.glyph)g=b.glyph}}var u=${urls}[g];if(u){var l=d.createElement("link");l.rel="preload";l.as="font";l.type="font/woff2";l.crossOrigin="anonymous";l.href=u;d.head.appendChild(l)}var c=s.getItem("orbis.charts.v1");if(c&&c.length>2&&s.getItem("orbis.charts.active")||s.getItem("${SPACE_FLAG}"))r.setAttribute("data-returning","")}catch(e){}})();`;
}

/**
 * The first view (lib/first-view.ts), run at the top of <body> once the CSS
 * is in: a returning reader's zodiac and houses, drawn from this device where
 * their wheel will be. Only on the natal page's flat wheel, and only when the
 * copy was made for the same theme, Look and window size; otherwise the page
 * starts as before. The copy is read from a private space that stays
 * unlocked on this device (opened with the key the browser keeps, a few
 * milliseconds), or from what versions before it kept in the clear. It never
 * creates the space's database, and gives way if the app got there first.
 * Fails open.
 */
export function firstViewScript(): string {
  return `(function(){try{var d=document,r=d.documentElement,s=localStorage,l=location,w=window;if(!r.hasAttribute("data-returning")||l.pathname!=="/")return;var q=new URLSearchParams(l.search),p=q.get("studio"),v=q.get("view"),k=s.getItem("ulune.studio.page");if(p?p!=="natal":k&&k!=="natal"&&k!=="table")return;if(v!=="wheel"&&(v==="table"||s.getItem("ulune.studio.view")==="table"))return;if(/"view":"3d"/.test(s.getItem("ulune.depth.v1")||""))return;var t=r.classList.contains("light")?"light":"dark",o=s.getItem("${BOOT_LOOK_KEY}."+t)||"";function draw(f){if(!f||f.v!==1||f.theme!==t||f.look!==o||f.w!==innerWidth||f.h!==innerHeight||w.${FIRST_VIEW_OVER}||d.querySelector("svg.ulune-wheel"))return;var e=d.createElement("${FIRST_VIEW_TAG}");e.setAttribute("aria-hidden","true");e.style.cssText="left:"+f.x+"px;top:"+f.y+"px;width:"+f.s+"px;height:"+f.s+"px";e.innerHTML=f.html;d.body.appendChild(e);r.setAttribute("${FIRST_VIEW_ATTR}","")}var g=s.getItem("${FIRST_VIEW_KEY}");if(g){var f=JSON.parse(g);if(f&&f.id===s.getItem("orbis.charts.active"))draw(f);return}if(s.getItem("${SPACE_FLAG}")!=="stay"||!w.indexedDB||!w.crypto||!crypto.subtle)return;var b=indexedDB.open("ulune-space");b.onupgradeneeded=function(){b.transaction.abort()};b.onsuccess=function(){var db=b.result;try{var x=db.transaction(["meta","items","device"]),m=x.objectStore("meta").get("space"),i=x.objectStore("items").get("${FIRST_VIEW_RECORD}"),y=x.objectStore("device").get("stay");x.oncomplete=function(){db.close();var M=m.result,I=i.result,K=y.result;if(!M||!I||!K)return;crypto.subtle.decrypt({name:"AES-GCM",iv:I.iv,additionalData:new TextEncoder().encode("ulune/space/v1/item/"+M.id+"/${FIRST_VIEW_RECORD}")},K,I.ct).then(function(u){draw(JSON.parse(new TextDecoder().decode(u)))},function(){})}}catch(z){db.close()}}}catch(x){}})();`;
}
