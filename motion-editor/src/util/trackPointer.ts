export function trackPointer(
    e: PointerEvent,
    onMove: (e: PointerEvent) => unknown,
    onUp: (e: PointerEvent) => unknown = () => {},
): () => void {
    const pointerMove: (e: PointerEvent) => void = (ev) => {
        if (ev.pointerId != e.pointerId) return;
        onMove(ev);
    };

    const pointerUp: (e: PointerEvent) => void = (ev) => {
        if (ev.pointerId != e.pointerId) return;
        onUp(ev);
        cancel();
    };

    const cancel: () => void = () => {
        document.removeEventListener("pointermove", pointerMove);
        document.removeEventListener("pointerup", pointerUp);
    };

    document.addEventListener("pointermove", pointerMove);
    document.addEventListener("pointerup", pointerUp);
    return cancel;
}
