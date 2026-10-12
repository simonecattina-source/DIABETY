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
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
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

              [role="tablist"] [role="tab"] *,
              [role="heading"],
              [role="heading"] * {
                overflow: visible !important;
              }
            `,
          }}
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
