// @ts-nocheck
import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="it" style={{ height: "100%", backgroundColor: "#0A0A0C", overflow: "hidden" }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        
        {/* 📐 FORCE VIEWPORT: Spinge iOS WebKit ad eliminare i margini protettivi bianchi del Notch */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        
        {/* 🛠️ MODALITÀ APPLICAZIONE NATIVA APPLE */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* 🎨 COLOR SYSTEM DI EMERGENZA NATIVO SAFARI */}
        <meta name="theme-color" content="#0A0A0C" />

        <ScrollViewStyleReset />
        
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* 🔐 BLOCCO STRUTTURALE HARDWARE IPHONE OVERRIDE */
              html, body, #root, #__next, [data-reactroot] { 
                background-color: #0A0A0C !important; 
                overflow: hidden !important; 
                position: fixed !important;
                top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
                width: 100% !important;
                height: 100% !important;
                height: 100vh !important;
                height: 100dvh !important; /* Dinamico per bloccare i rimbalzi di Safari */
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
                height: 100dvh !important;
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
