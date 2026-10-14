import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/**
 * Documento HTML iniziale di Expo Router Web.
 * Mantiene il tema OLED anche nelle safe area di Safari iOS,
 * senza forzare position: fixed/absolute sui contenitori React Native Web.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="it" style={{ backgroundColor: "#0A0A0C", height: "100%" }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="theme-color" content="#0A0A0C" />
        <link rel="manifest" href="/manifest.json" />
        <ScrollViewStyleReset />
        {/* Safari iOS: il solo viewport non blocca sempre pinch e doppio tap. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                // Safari emette gesturestart/change per il pinch-to-zoom.
                function stopZoom(event) {
                  if (event.cancelable) event.preventDefault();
                }
                document.addEventListener('gesturestart', stopZoom, { passive: false });
                document.addEventListener('gesturechange', stopZoom, { passive: false });
                document.addEventListener('gestureend', stopZoom, { passive: false });

                // Fallback per browser che non emettono gli eventi gesture*.
                document.addEventListener('touchmove', function (event) {
                  if (event.touches && event.touches.length > 1) stopZoom(event);
                }, { passive: false });

                // Impedisce il doppio tap per ingrandire senza bloccare i tocchi normali.
                // I controlli interattivi restano utilizzabili anche con tocchi rapidi.
                var lastTapTime = 0;
                var lastTapX = 0;
                var lastTapY = 0;
                document.addEventListener('touchend', function (event) {
                  if (!event.changedTouches || event.changedTouches.length !== 1) return;
                  var target = event.target;
                  if (target && target.closest && target.closest('input, textarea, select, button, a, [role="button"], [contenteditable="true"]')) {
                    lastTapTime = 0;
                    return;
                  }
                  var touch = event.changedTouches[0];
                  var now = Date.now();
                  if (now - lastTapTime < 320 &&
                      Math.abs(touch.clientX - lastTapX) < 28 &&
                      Math.abs(touch.clientY - lastTapY) < 28) {
                    stopZoom(event);
                    lastTapTime = 0;
                  } else {
                    lastTapTime = now;
                    lastTapX = touch.clientX;
                    lastTapY = touch.clientY;
                  }
                }, { passive: false });

                document.addEventListener('dblclick', stopZoom, { passive: false });
              })();
            `,
          }}
        />

        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root { color-scheme: dark; }
              html, body {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
                min-height: 100%;
                background: #0A0A0C !important;
                overscroll-behavior: none;
                touch-action: pan-x pan-y;
              }

              body {
                overflow: hidden;
                overscroll-behavior: none;
              }

              /* Il root React deve riempire la pagina, senza posizionamento
                 fixed/absolute che interferisca con Safari standalone. */
              #root, #__next, body > div:first-child {
                background-color: #0A0A0C;
                width: 100%;
                height: 100%;
                min-height: 100%;
                height: 100dvh;
              }

              /* Mantiene nero il livello di navigazione e le aree non coperte. */
              body { background-color: #0A0A0C !important; }

              [role="tablist"] [role="tab"] *,
              [role="heading"],
              [role="heading"] * {
                overflow: visible !important;
              }
            `,
          }}
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          width: "100%",
          height: "100%",
          overflow: "hidden",
          backgroundColor: "#0A0A0C",
        }}
      >
        {children}
      </body>
    </html>
  );
}
