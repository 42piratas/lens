"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2, Plus, GripVertical } from "lucide-react";
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
import { PinIcon } from "@/components/shell/PinIcon";
import { PinDialog, type PinDialogMode } from "@/components/shell/PinDialog";
import { SettingsSection } from "../SettingsSection";

function PinManagerRow({
  pin,
  onEdit,
  onDelete,
}: {
  pin: Pin;
  onEdit: (pin: Pin) => void;
  onDelete: (id: string) => void;
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
    <li ref={setNodeRef} style={style} className="lens-settings-pin-row">
      <button
        type="button"
        className="lens-settings-pin-handle"
        aria-label="Drag to reorder"
        title="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} aria-hidden />
      </button>
      <span className="lens-settings-pin-icon" aria-hidden>
        <PinIcon iconName={pin.icon} url={pin.url} size={18} />
      </span>
      <span className="lens-settings-pin-meta">
        <span className="lens-settings-pin-label">{pin.label}</span>
        <span className="lens-settings-pin-url">{pin.url}</span>
      </span>
      <span className="lens-settings-pin-actions">
        <button
          type="button"
          onClick={() => onEdit(pin)}
          aria-label={`Edit pin ${pin.label}`}
          title="Edit"
          className="lens-settings-pin-iconbtn"
        >
          <Pencil size={14} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => onDelete(pin.id)}
          aria-label={`Delete pin ${pin.label}`}
          title="Delete"
          className="lens-settings-pin-iconbtn lens-settings-pin-iconbtn--danger"
        >
          <Trash2 size={14} aria-hidden />
        </button>
      </span>
    </li>
  );
}

export function PinboardSection() {
  const hydrated = usePinboardStore((s) => s.hydrated);
  const hydrate = usePinboardStore((s) => s.hydrate);
  const enabled = usePinboardStore((s) => s.enabled);
  const setEnabled = usePinboardStore((s) => s.setEnabled);
  const pins = usePinboardStore((s) => s.pins);
  const addPin = usePinboardStore((s) => s.addPin);
  const updatePin = usePinboardStore((s) => s.updatePin);
  const removePin = usePinboardStore((s) => s.removePin);
  const reorderPins = usePinboardStore((s) => s.reorderPins);

  const [dialog, setDialog] = useState<PinDialogMode | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = pins.findIndex((p) => p.id === active.id);
    const newIndex = pins.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(pins, oldIndex, newIndex);
    reorderPins(next.map((p) => p.id));
  };

  return (
    <SettingsSection id="pinboard" title="Pinboard" multi>
      <div className="lens-settings-row">
        <span className="lens-settings-row-label">Enable</span>
        <div className="lens-settings-row-value">
          <label className="lens-settings-toggle">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              aria-label="Enable Pinboard"
            />
            <span>{enabled ? "On" : "Off"}</span>
          </label>
        </div>
      </div>

      {enabled ? (
        <div className="lens-settings-pin-manager">
          {pins.length === 0 ? (
            <p className="lens-settings-tbd">No pins yet — add your first one below.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={pins.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <ul className="lens-settings-pin-list">
                  {pins.map((pin) => (
                    <PinManagerRow
                      key={pin.id}
                      pin={pin}
                      onEdit={(p) => setDialog({ kind: "edit", pin: p })}
                      onDelete={(id) => removePin(id)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
          <button
            type="button"
            onClick={() => setDialog({ kind: "create" })}
            className="lens-settings-pin-add"
          >
            <Plus size={14} aria-hidden /> Add pin
          </button>
        </div>
      ) : null}

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
    </SettingsSection>
  );
}
