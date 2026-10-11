// @ts-nocheck
import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="it" style={{ height: "100%", backgroundColor: "#0A0A0C", overflow: "hidden" }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        
        {/* 📐 ADATTAMENTO GEOMETRICO ASSOLUTO */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover, user-scalable=no"
        />

        {/* 🛠️ MODALITÀ APPLICAZIONE NATIVA APPLE */}
        <meta name="apple-mobile-web-app-capable" content="yes" />

        {/* 🎨 FUSIONE TOTALE: Permette allo sfondo nero di salire fin sopra Notch e Isola Dinamica */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        <ScrollViewStyleReset />
        
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body { 
                background-color: #0A0A0C !important; 
                overflow: hidden !important; 
                position: fixed !important;
                width: 100% !important;
                height: 100% !important;
                overscroll-behavior: none !important;
                -webkit-overflow-scrolling: touch;
              }
              body > div:first-child { 
                position: fixed !important; 
                top: 0; 
                left: 0; 
                right: 0; 
                bottom: 0; 
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
        tabBarStyle: {
          backgroundColor: DESIGN_NEON.backgroundBar,
          borderTopColor: DESIGN_NEON.borderGlass,
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
          // 🛠️ RISOLTO: Altezza fissa di sicurezza per eliminare lo sfasamento e la barra bianca inferiore su iOS Home Screen
          ...(Platform.OS === "web" ? { 
            height: typeof window !== 'undefined' && window.navigator.standalone ? 78 : 64, 
            paddingTop: typeof window !== 'undefined' && window.navigator.standalone ? 6 : 0,
            paddingBottom: typeof window !== 'undefined' && window.navigator.standalone ? 20 : 0 
          } : {}), 
        },
