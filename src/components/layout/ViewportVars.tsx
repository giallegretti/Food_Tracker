"use client";

import { useEffect } from "react";
import { isTextField } from "@/lib/reveal";

// Publica a área visível real como variáveis CSS:
//   --vvh  altura visível (já descontando o teclado)
//   --kb   quanto o teclado cobre do fundo do layout
// No iOS o layout não encolhe quando o teclado abre, então vh/dvh não servem
// para encaixar drawers; o visualViewport é a única medida confiável.
// Também marca <html data-keyboard="open"> enquanto um campo de texto está focado.
export function ViewportVars() {
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;
    let frame = 0;

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height = vv ? vv.height : window.innerHeight;
        const offsetTop = vv ? vv.offsetTop : 0;
        const keyboard = Math.max(0, root.clientHeight - height - offsetTop);
        root.style.setProperty("--vvh", `${Math.round(height)}px`);
        root.style.setProperty("--kb", `${Math.round(keyboard)}px`);
      });
    };

    const onFocusIn = (e: FocusEvent) => {
      if (isTextField(e.target as Element)) root.dataset.keyboard = "open";
    };
    const onFocusOut = () => {
      // Espera o próximo foco: pular de um campo para outro não fecha o teclado
      setTimeout(() => {
        if (!isTextField(document.activeElement)) delete root.dataset.keyboard;
      }, 50);
    };

    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      cancelAnimationFrame(frame);
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  return null;
}
