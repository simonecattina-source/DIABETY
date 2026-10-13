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
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#0A0A0C" />
        <link rel="manifest" href="/manifest.json" />
        <ScrollViewStyleReset />
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



              /* Esperimento iOS 27: pannello temporaneo per aggiornare il compositing.
                 Solo PWA standalone su dispositivi iOS; non modifica il layout. */
              #diabety-ios-blur-cover {
                display: none;
                position: fixed;
                inset: 0;
                z-index: 2147483646;
                background: rgba(255, 255, 255, 0.01);
                pointer-events: none;
                animation: diabety-ios-cover-fade 0.3s;
              }
              #diabety-ios-blur-panel {
                position: fixed;
                top: 0;
                right: 0;
                bottom: 0;
                width: 90%;
                height: 100%;
                z-index: 2147483647;
                background: rgba(255, 255, 255, 0.01);
                pointer-events: none;
                transform: translateX(110%);
                transition: transform 0.3s;
              }
              @keyframes diabety-ios-cover-fade {
                from { opacity: 0; }
                to { opacity: 1; }
              }

              [role="tablist"] [role="tab"] *,
              [role="heading"],
              [role="heading"] * {
                overflow: visible !important;
              }
            `,
          }}
        />
        {/* Esperimento isolato: eseguito una sola volta all'avvio della PWA iOS. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('load', function () {
                var standalone = window.matchMedia('(display-mode: standalone)').matches ||
                  window.navigator.standalone === true;
                var ios = /iPhone|iPad|iPod/.test(window.navigator.userAgent);
                if (!standalone || !ios || document.getElementById('diabety-ios-blur-panel')) return;

                var cover = document.createElement('div');
                cover.id = 'diabety-ios-blur-cover';
                cover.setAttribute('aria-hidden', 'true');
                var panel = document.createElement('div');
                panel.id = 'diabety-ios-blur-panel';
                panel.setAttribute('aria-hidden', 'true');
                document.body.appendChild(cover);
                document.body.appendChild(panel);

                void panel.offsetWidth;
                window.requestAnimationFrame(function () {
                  cover.style.display = 'block';
                  panel.style.transform = 'translateX(0%)';
                  window.setTimeout(function () {
                    cover.style.display = 'none';
                    panel.style.transform = 'translateX(110%)';
                    // Il pannello resta nel DOM fuori schermo: parte del test.
                  }, 500);
                });
              }, { once: true });
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
