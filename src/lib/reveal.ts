const NON_TEXT_INPUTS = new Set([
  "button",
  "checkbox",
  "color",
  "date",
  "datetime-local",
  "file",
  "month",
  "radio",
  "range",
  "reset",
  "submit",
  "time",
  "week",
]);

// Campos que abrem o teclado virtual
export function isTextField(el: Element | null): el is HTMLElement {
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(el.type);
  return el instanceof HTMLElement && el.isContentEditable;
}

// Rola o container que contém `el` até ele ficar visível. Dentro de uma
// drawer rola só o corpo dela; fora, rola a página. Evita scrollIntoView
// porque no iOS ele também desloca o viewport e a drawer sai do lugar.
// `extendTo`: tenta mostrar também o fim desse elemento (ex.: o formulário do
// campo, para os botões de confirmar ficarem à vista junto com ele).
export function revealElement(
  el: HTMLElement,
  align: "start" | "center" | "nearest" = "nearest",
  extendTo?: HTMLElement | null
) {
  const scroller = el.closest<HTMLElement>('[data-slot="sheet-body"]');
  if (!scroller) {
    el.scrollIntoView({ block: align, behavior: "smooth" });
    return;
  }

  const margin = 12;
  const box = scroller.getBoundingClientRect();
  const own = el.getBoundingClientRect();
  let rect = { top: own.top, bottom: own.bottom, height: own.height };
  if (extendTo) {
    const bottom = Math.max(own.bottom, extendTo.getBoundingClientRect().bottom);
    if (bottom - own.top <= scroller.clientHeight - margin * 2) {
      rect = { top: own.top, bottom, height: bottom - own.top };
    }
  }
  const top = rect.top - box.top + scroller.scrollTop;

  let next = scroller.scrollTop;
  if (align === "start") {
    next = top - margin;
  } else if (align === "center") {
    next = top - (scroller.clientHeight - rect.height) / 2;
  } else if (rect.top < box.top + margin) {
    next = top - margin;
  } else if (rect.bottom > box.bottom - margin) {
    next = top + rect.height - scroller.clientHeight + margin;
  }

  scroller.scrollTo({ top: Math.max(0, next), behavior: "smooth" });
}
