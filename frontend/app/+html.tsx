// @ts-nocheck
import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="it" style={{ height: "100%", backgroundColor: "#0A0A0C", overflow: "hidden" }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        
        {/* 📐 AZZERAMENTO DEI MARGINI E ACCESSO IMMERSIVO NATIVO */}
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* 🎨 METATAG DI EMERGENZA SAFARI: Dice a iOS il colore esatto del notch prima della grafica */}
        <meta name="theme-color" content="#0A0A0C" />

        <ScrollViewStyleReset />
        
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root, #__next, [data-reactroot] { 
                background-color: #0A0A0C !important; 
                overflow: hidden !important; 
                position: fixed !important;
                top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
                width: 100% !important;
                height: 100% !important;
                margin: 0 !important; padding: 0 !important;
                overscroll-behavior: none !important;
                overscroll-behavior-y: none !important;
                -webkit-overflow-scrolling: touch;
              }
              body > div:first-child { 
                position: fixed !important; 
                top: 0; left: 0; right: 0; bottom: 0; 
                background-color: #0A0A0C !important;
                overflow: hidden !important;
              }
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
