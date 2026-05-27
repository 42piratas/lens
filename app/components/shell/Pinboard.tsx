"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { usePinboardStore } from "@/lib/pinboard/store";
import type { Pin } from "@/lib/pinboard/schema";
import { PinIcon } from "./PinIcon";
import { PinDialog, type PinDialogMode } from "./PinDialog";

type ContextMenu = { id: string; x: number; y: number };

function PinRow({
  pin,
  onContext,
}: {
  pin: Pin;
  onContext: (e: React.MouseEvent, id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: pin.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <a
      ref={setNodeRef}
      style={style}
      href={pin.url}
      target="_blank"
      rel="noopener noreferrer"
      onContextMenu={(e) => onContext(e, pin.id)}
      title={pin.label}
      aria-label={pin.label}
      className="lens-dock-btn lens-pin-btn"
      data-pin-id={pin.id}
      {...attributes}
      {...listeners}
    >
      <PinIcon iconName={pin.icon} url={pin.url} size={18} />
    </a>
  );
}

export function Pinboard() {
  const hydrated = usePinboardStore((s) => s.hydrated);
  const hydrate = usePinboardStore((s) => s.hydrate);
  const enabled = usePinboardStore((s) => s.enabled);
  const pins = usePinboardStore((s) => s.pins);
  const addPin = usePinboardStore((s) => s.addPin);
  const updatePin = usePinboardStore((s) => s.updatePin);
  const removePin = usePinboardStore((s) => s.removePin);
  const reorderPins = usePinboardStore((s) => s.reorderPins);

  const [dialog, setDialog] = useState<PinDialogMode | null>(null);
  const [menu, setMenu] = useState<ContextMenu | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Slight activation distance so a quick click never triggers a drag start.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  useEffect(() => {
    if (!menu) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  if (!hydrated || !enabled) return null;

  const onContext = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setMenu({ id, x: e.clientX, y: e.clientY });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = pins.findIndex((p) => p.id === active.id);
    const newIndex = pins.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(pins, oldIndex, newIndex);
    reorderPins(next.map((p) => p.id));
  };

  const menuTarget = menu ? pins.find((p) => p.id === menu.id) : null;

  return (
    <>
      <aside className="lens-pinboard" aria-label="Pinboard">
        {pins.length === 0 ? (
          <button
            type="button"
            onClick={() => setDialog({ kind: "create" })}
            aria-label="Add pin"
            title="Add pin"
            className="lens-dock-btn lens-pin-btn--add"
          >
            <Plus size={18} strokeWidth={1.75} aria-hidden />
          </button>
        ) : (
          <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={pins.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <nav className="lens-pinboard-nav" aria-label="Pinned shortcuts">
                  {pins.map((pin) => (
                    <PinRow key={pin.id} pin={pin} onContext={onContext} />
                  ))}
                </nav>
              </SortableContext>
            </DndContext>
            <button
              type="button"
              onClick={() => setDialog({ kind: "create" })}
              aria-label="Add pin"
              title="Add pin"
              className="lens-dock-btn lens-pin-btn--add"
            >
              <Plus size={18} strokeWidth={1.75} aria-hidden />
            </button>
          </>
        )}
      </aside>

      {menu && menuTarget && (
        <div
          ref={menuRef}
          className="lens-ws-context-menu"
          role="menu"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setDialog({ kind: "edit", pin: menuTarget });
              setMenu(null);
            }}
            className="lens-ws-context-menu-item"
          >
            <Pencil size={14} aria-hidden /> Edit
          </button>
          <div className="lens-ws-context-menu-sep" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              removePin(menuTarget.id);
              setMenu(null);
            }}
            className="lens-ws-context-menu-item lens-ws-context-menu-item--danger"
          >
            <Trash2 size={14} aria-hidden /> Delete
          </button>
        </div>
      )}

      {dialog && (
        <PinDialog
          mode={dialog}
          onClose={() => setDialog(null)}
          onConfirmCreate={(input) => {
            addPin(input);
            setDialog(null);
          }}
          onConfirmEdit={(id, input) => {
            updatePin(id, input);
            setDialog(null);
          }}
        />
      )}
    </>
  );
}
