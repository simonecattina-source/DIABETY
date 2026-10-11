// @ts-nocheck
import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="it" style={{ height: "100%", backgroundColor: "#0A0A0C", overflow: "hidden" }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        
        {/* 📐 FORZATURA HARDWARE: Ordina a iOS di non rimpicciolire o incapsulare l'interfaccia */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#0A0A0C" />

        {/* 🛠️ RISOLUZIONE DEFINITIVA IPHONE: Collega il file manifest per sbloccare la modalità standalone immersiva */}
        <link rel="manifest" href="/manifest.json" />

        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* 🛠️ RISOLTO: Rimuove la "gabbia di pixel" fissa iniettata da Expo e costringe l'app a espandersi al 100% dell'iPhone */
              body > div:first-child { 
                position: absolute !important; /* Cambiato da fixed a absolute per sbloccare l'ancoraggio */
                top: 0 !important; 
                left: 0 !important; 
                right: 0 !important; 
                bottom: 0 !important; 
                width: 100% !important;
                height: 100% !important;
                height: 100vh !important;
                height: 100dvh !important; /* Imposta l'altezza dinamica dell'iPhone */
                background-color: #0A0A0C !important;
                overflow: hidden !important;
              }

              /* Reset totale dei contenitori di rendering di React Native Web */
              html, body, #root, #__next, [data-reactroot] { 
                background-color: #0A0A0C !important; 
                overflow: hidden !important; 
                position: fixed !important;
                top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
                width: 100% !important;
                height: 100% !important;
                height: 100vh !important;
                height: 100dvh !important;
                margin: 0 !important; padding: 0 !important;
                overscroll-behavior: none !important;
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
