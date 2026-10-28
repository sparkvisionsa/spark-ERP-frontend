"use client";

import { useEffect, useRef } from "react";

const INTERACTIVE_SELECTOR =
  'a, button, [role="button"], [role="link"], summary, label[for], [draggable="true"]';
const EDITABLE_SELECTOR =
  'input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"]';

export function ErpCursor() {
  const cursorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!cursor || !finePointer.matches || reducedMotion.matches) return;

    const root = document.documentElement;
    let animationFrame = 0;
    let x = -100;
    let y = -100;

    const renderPosition = () => {
      cursor.style.setProperty("--erp-cursor-x", `${x}px`);
      cursor.style.setProperty("--erp-cursor-y", `${y}px`);
      animationFrame = 0;
    };

    const updateTargetState = (target: EventTarget | null) => {
      if (!(target instanceof Element)) {
        cursor.dataset.interactive = "false";
        cursor.dataset.drag = "false";
        cursor.dataset.hidden = "false";
        return;
      }

      const isEditable = Boolean(target.closest(EDITABLE_SELECTOR));
      const interactiveTarget = target.closest(INTERACTIVE_SELECTOR);
      const isDisabled = Boolean(
        interactiveTarget?.matches(':disabled, [aria-disabled="true"]'),
      );

      cursor.dataset.hidden = String(isEditable);
      cursor.dataset.interactive = String(
        Boolean(interactiveTarget) && !isEditable && !isDisabled,
      );
      cursor.dataset.drag = String(
        Boolean(target.closest('[draggable="true"], [data-drag-handle]')),
      );
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== "mouse") return;

      x = event.clientX;
      y = event.clientY;
      cursor.dataset.visible = "true";
      updateTargetState(event.target);

      if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(renderPosition);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      cursor.dataset.pressed = "true";
    };

    const handlePointerUp = () => {
      cursor.dataset.pressed = "false";
    };

    const handlePointerLeave = (event: MouseEvent) => {
      if (!event.relatedTarget) cursor.dataset.visible = "false";
    };

    const handleWindowBlur = () => {
      cursor.dataset.visible = "false";
      cursor.dataset.pressed = "false";
    };

    root.classList.add("erp-custom-cursor");
    document.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("pointerdown", handlePointerDown, { passive: true });
    document.addEventListener("pointerup", handlePointerUp, { passive: true });
    document.addEventListener("mouseleave", handlePointerLeave);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      root.classList.remove("erp-custom-cursor");
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("mouseleave", handlePointerLeave);
      window.removeEventListener("blur", handleWindowBlur);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <span
      ref={cursorRef}
      className="erp-system-cursor"
      data-visible="false"
      data-interactive="false"
      data-pressed="false"
      data-drag="false"
      data-hidden="false"
      aria-hidden="true"
    >
      <span className="erp-cursor-ring" />
      <span className="erp-cursor-core" />
    </span>
  );
}
