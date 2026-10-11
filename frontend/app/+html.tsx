// @ts-nocheck
import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="it" style={{ height: "100%", backgroundColor: "#0A0A0C" }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        
        {/* 📐 ADATTAMENTO GEOMETRICO: Forza l'app a riempire le Safe Area del Notch dell'iPhone */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover, user-scalable=no"
        />

        {/* 🛠️ DISATTIVA INTERFACCIA BROWSER: Dice a Safari di nascondere le barre e agire come app nativa */}
        <meta name="apple-mobile-web-app-capable" content="yes" />

        {/* 🎨 RISOLTO: Impostato su "black" solido per eliminare definitivamente lo sfondo bianco o sfumato in cima sul Notch */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />

        {/*
          Disable body scrolling on web to make ScrollView components work correctly.
          If you want to enable scrolling, remove `ScrollViewStyleReset` and
          set `overflow: auto` on the body style below.
        */}
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body { background-color: #0A0A0C !important; }
              body > div:first-child { position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; }
              [role="tablist"] [role="tab"] * { overflow: visible !important; }
              [role="heading"], [role="heading"] * { overflow: visible !important; }
            `,
          }}
        />
      </head>
      <body
        style={{
          margin: 0,
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0A0A0C",
        }}
      >
        {children}
      </body>
    </html>
  );
}
