"use client";
import AppShell from "@/components/AppShell";
import { Card, PageTitle } from "@/components/ui";
import {
  CLEANING_DAILY,
  CLEANING_EVERY_2_3_DAYS,
  CLEANING_IMMEDIATE,
  CLEANING_WEEKLY,
  DO_NOT_BUY,
  INVENTORY_SEED,
  MOVEMENT_RULES,
  PPE_MATRIX,
  PROTOCOLS,
  RESPIRATOR_FIT_CHECK,
  SHOPPING,
  SUN_RULES,
  ZONES,
  type ZoneKey,
} from "@/lib/home-ops-data";
import { useEntries, type InventoryItem } from "@/lib/store";
import { useSession } from "@/lib/session";
import {
  AlertTriangle,
  Boxes,
  Brush,
  Building2,
  CheckCircle2,
  Dog,
  Droplet,
  Flag,
  Home,
  Minus,
  Package,
  Plus,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
  Sun,
  Trash2,
  UserX,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Tab = "zones" | "inventory" | "shopping" | "routines" | "protocols";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "zones", label: "Zones", icon: <Home size={16} /> },
  { key: "inventory", label: "Inventory", icon: <Boxes size={16} /> },
  { key: "shopping", label: "Shopping", icon: <ShoppingCart size={16} /> },
  { key: "routines", label: "Routines", icon: <Sparkles size={16} /> },
  { key: "protocols", label: "Protocols", icon: <ShieldAlert size={16} /> },
];

export default function HomeOps() {
  const [tab, setTab] = useState<Tab>("zones");
  const [deepLinkSlug, setDeepLinkSlug] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    if ((["zones", "inventory", "shopping", "routines", "protocols"] as const).includes(hash as Tab)) {
      setTab(hash as Tab);
      return;
    }
    if (PROTOCOLS.some((p) => p.slug === hash)) {
      setTab("protocols");
      setDeepLinkSlug(hash);
    }
  }, []);

  return (
    <AppShell>
      <PageTitle sub="Zones, kits, inventory, routines and protocols for running a protected household.">
        Home Ops
      </PageTitle>

      <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm border transition ${
              tab === t.key
                ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                : "bg-[var(--surface)] border-[var(--border)] text-[var(--ink)]"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "zones" && <ZonesTab />}
      {tab === "inventory" && <InventoryTab />}
      {tab === "shopping" && <ShoppingTab />}
      {tab === "routines" && <RoutinesTab />}
      {tab === "protocols" && <ProtocolsTab initialSlug={deepLinkSlug} />}
    </AppShell>
  );
}

// ————————————————————————————————————————————————————————
// Zones
// ————————————————————————————————————————————————————————
function ZonesTab() {
  const [open, setOpen] = useState<ZoneKey | null>("white");
  return (
    <div className="space-y-4">
      <Card>
        <div className="text-xs uppercase tracking-widest text-[var(--ink-soft)] font-semibold mb-2">
          The zone system
        </div>
        <p className="text-sm text-[var(--ink)] mb-3">
          Four zones with a clean-to-dirty flow. Protect Zone 1. Let Zone 3 hold
          all contamination, laundry, waste and master stock.
        </p>
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {ZONES.map((z) => (
            <button
              key={z.key}
              type="button"
              onClick={() => setOpen(open === z.key ? null : z.key)}
              className="flex flex-col items-center justify-center rounded-xl px-1 py-2.5 border transition"
              style={{
                backgroundColor: z.color,
                color: z.textOn,
                borderColor: open === z.key ? "var(--primary)" : "rgba(0,0,0,0.12)",
                boxShadow: open === z.key ? "0 0 0 2px var(--primary)" : "none",
              }}
              aria-label={z.label}
            >
              <div className="text-xs font-bold uppercase tracking-wide">
                {z.key === "white"
                  ? "White"
                  : z.key === "yellow"
                    ? "Yellow"
                    : z.key === "orange"
                      ? "Orange"
                      : "Red"}
              </div>
              <div className="text-[10px] opacity-80 mt-0.5">Zone {zoneNum(z.key)}</div>
            </button>
          ))}
        </div>
        <ul className="text-xs text-[var(--ink-soft)] space-y-1">
          {MOVEMENT_RULES.map((r) => (
            <li key={r} className="flex gap-2">
              <span aria-hidden>→</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </Card>

      {ZONES.filter((z) => open === null || open === z.key).map((z) => (
        <Card key={z.key} className="overflow-hidden p-0">
          <div className="px-4 py-3" style={{ backgroundColor: z.color, color: z.textOn }}>
            <div className="font-bold">{z.label}</div>
            <div className="text-xs opacity-80">{z.rooms}</div>
          </div>
          <div className="p-4 space-y-3">
            <div className="text-sm"><b>Purpose.</b> {z.purpose}</div>
            <div className="text-sm"><b>People.</b> {z.people}</div>

            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] font-semibold mb-1.5">Keep here</div>
              <ul className="text-sm space-y-1">
                {z.keepHere.map((i) => (
                  <li key={i} className="flex gap-2">
                    <CheckCircle2 size={14} className="text-[var(--primary)] shrink-0 mt-0.5" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] font-semibold mb-1.5">Keep out</div>
              <ul className="text-sm space-y-1">
                {z.keepOut.map((i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-[var(--alert)] shrink-0">✕</span>
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] font-semibold mb-1.5">Restock when</div>
              <ul className="text-sm space-y-1">
                {z.restockWhen.map((i) => (
                  <li key={i} className="flex gap-2">
                    <Package size={14} className="text-[var(--accent)] shrink-0 mt-0.5" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function zoneNum(k: ZoneKey) {
  return k === "white" ? 1 : k === "yellow" ? 2 : k === "orange" ? 3 : 4;
}

// ————————————————————————————————————————————————————————
// Inventory
// ————————————————————————————————————————————————————————
function InventoryTab() {
  const items = useEntries("inventory");
  const { addEntry, updateEntry, deleteEntry } = useSession();
  const [filter, setFilter] = useState<"all" | "low" | ZoneKey>("all");
  const [adding, setAdding] = useState(false);

  const lowStock = items.filter((i) => i.quantity <= i.threshold);
  const filtered = useMemo(() => {
    let list = items.slice();
    if (filter === "low") list = list.filter((i) => i.quantity <= i.threshold);
    else if (filter !== "all") list = list.filter((i) => i.zone === filter);
    return list.sort((a, b) =>
      a.zone !== b.zone ? zoneNum(a.zone) - zoneNum(b.zone) : a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
    );
  }, [items, filter]);

  const seedStarter = async () => {
    for (const s of INVENTORY_SEED) {
      await addEntry({ kind: "inventory", ...s } as Omit<InventoryItem, "id" | "createdAt">);
    }
  };

  const adjust = (item: InventoryItem, delta: number) => {
    const next = Math.max(0, item.quantity + delta);
    updateEntry(item.id, { quantity: next } as Partial<InventoryItem>);
  };

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <Card className="text-center py-6">
          <Boxes size={28} className="mx-auto text-[var(--ink-soft)] mb-2" />
          <div className="font-semibold mb-1">No inventory yet</div>
          <p className="text-sm text-[var(--ink-soft)] mb-4">
            Seed a starter inventory based on the zone kits, or add items manually.
          </p>
          <div className="flex gap-2">
            <button
              onClick={seedStarter}
              className="flex-1 rounded-xl bg-[var(--primary)] text-white py-2.5 text-sm font-medium"
            >
              Seed starter kit
            </button>
            <button
              onClick={() => setAdding(true)}
              className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm font-medium"
            >
              Add manually
            </button>
          </div>
        </Card>
      ) : (
        <>
          {lowStock.length > 0 && filter !== "low" && (
            <button
              onClick={() => setFilter("low")}
              className="w-full rounded-2xl border-2 border-[var(--alert)] bg-[var(--alert-soft)] p-3 flex items-center gap-3 active:scale-[0.99] transition"
            >
              <AlertTriangle size={20} className="text-[var(--alert)] shrink-0" />
              <div className="text-left flex-1">
                <div className="font-bold text-[var(--alert)]">
                  {lowStock.length} item{lowStock.length > 1 ? "s" : ""} at or below threshold
                </div>
                <div className="text-xs text-[var(--ink-soft)]">Tap to see what needs restocking</div>
              </div>
            </button>
          )}

          <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
            {(
              [
                ["all", "All"],
                ["low", `Low (${lowStock.length})`],
                ["white", "Z1 White"],
                ["yellow", "Z2 Yellow"],
                ["orange", "Z3 Orange"],
                ["red", "Z4 Red"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFilter(k as typeof filter)}
                className={`shrink-0 rounded-full px-3 py-1.5 border ${
                  filter === k
                    ? "bg-[var(--ink)] text-[var(--surface)] border-[var(--ink)]"
                    : "border-[var(--border)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filtered.map((item) => (
              <InventoryRow
                key={item.id}
                item={item}
                onInc={() => adjust(item, 1)}
                onDec={() => adjust(item, -1)}
                onDelete={() => deleteEntry(item.id)}
              />
            ))}
          </div>

          {!adding ? (
            <button
              onClick={() => setAdding(true)}
              className="w-full rounded-2xl border-2 border-dashed border-[var(--border)] py-3 text-sm font-medium text-[var(--ink-soft)]"
            >
              + Add item
            </button>
          ) : (
            <AddItemForm onDone={() => setAdding(false)} />
          )}
        </>
      )}
    </div>
  );
}

function InventoryRow({
  item,
  onInc,
  onDec,
  onDelete,
}: {
  item: InventoryItem;
  onInc: () => void;
  onDec: () => void;
  onDelete: () => void;
}) {
  const zone = ZONES.find((z) => z.key === item.zone)!;
  const low = item.quantity <= item.threshold;
  return (
    <Card className={low ? "border-[var(--alert)]" : undefined}>
      <div className="flex items-center gap-3">
        <div
          className="w-2 h-10 rounded-full shrink-0"
          style={{ backgroundColor: zone.color, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12)" }}
          aria-label={zone.label}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-semibold truncate">{item.name}</div>
            {low && <AlertTriangle size={14} className="text-[var(--alert)] shrink-0" />}
          </div>
          <div className="text-xs text-[var(--ink-soft)]">
            Z{zoneNum(item.zone)} · {item.category}
            {item.unit ? ` · ${item.unit}` : ""}
            {" · "}
            threshold {item.threshold}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onDec}
            className="w-9 h-9 rounded-full border border-[var(--border)] flex items-center justify-center active:bg-[var(--surface-soft)]"
            aria-label="Decrease"
          >
            <Minus size={16} />
          </button>
          <div className="w-8 text-center font-bold tabular-nums">{item.quantity}</div>
          <button
            onClick={onInc}
            className="w-9 h-9 rounded-full bg-[var(--primary)] text-white flex items-center justify-center active:scale-95"
            aria-label="Increase"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={onDelete}
            className="w-8 h-8 text-[var(--ink-soft)] flex items-center justify-center"
            aria-label="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </Card>
  );
}

function AddItemForm({ onDone }: { onDone: () => void }) {
  const { addEntry } = useSession();
  const [name, setName] = useState("");
  const [zone, setZone] = useState<ZoneKey>("white");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [threshold, setThreshold] = useState(1);
  const [unit, setUnit] = useState("");

  const save = async () => {
    if (!name.trim()) return;
    await addEntry({
      kind: "inventory",
      name: name.trim(),
      zone,
      category: category.trim() || "Other",
      quantity,
      threshold,
      unit: unit.trim() || undefined,
    } as Omit<InventoryItem, "id" | "createdAt">);
    onDone();
  };

  return (
    <Card className="space-y-3">
      <div>
        <div className="text-sm font-medium mb-1.5">Item name</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Paper towel"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[16px]"
        />
      </div>
      <div>
        <div className="text-sm font-medium mb-1.5">Zone</div>
        <div className="grid grid-cols-4 gap-1.5">
          {ZONES.map((z) => (
            <button
              key={z.key}
              type="button"
              onClick={() => setZone(z.key)}
              className="rounded-xl px-2 py-2 text-xs font-semibold border"
              style={{
                backgroundColor: zone === z.key ? z.color : "var(--surface)",
                color: zone === z.key ? z.textOn : "var(--ink)",
                borderColor: zone === z.key ? "var(--primary)" : "var(--border)",
              }}
            >
              Z{zoneNum(z.key)}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-sm font-medium mb-1.5">Category</div>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Cleaning"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[16px]"
          />
        </div>
        <div>
          <div className="text-sm font-medium mb-1.5">Unit (optional)</div>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="e.g. rolls"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[16px]"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-sm font-medium mb-1.5">Quantity</div>
          <input
            type="number"
            min={0}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(0, Number(e.target.value) || 0))}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[16px]"
          />
        </div>
        <div>
          <div className="text-sm font-medium mb-1.5">Restock threshold</div>
          <input
            type="number"
            min={0}
            value={threshold}
            onChange={(e) => setThreshold(Math.max(0, Number(e.target.value) || 0))}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[16px]"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onDone} className="flex-1 rounded-xl border border-[var(--border)] py-2.5 font-medium">
          Cancel
        </button>
        <button
          onClick={save}
          disabled={!name.trim()}
          className="flex-1 rounded-xl bg-[var(--primary)] text-white py-2.5 font-semibold disabled:opacity-60"
        >
          Add
        </button>
      </div>
    </Card>
  );
}

// ————————————————————————————————————————————————————————
// Shopping
// ————————————————————————————————————————————————————————
function ShoppingTab() {
  return (
    <div className="space-y-4">
      <Card>
        <div className="text-sm">
          <b>Buy once. Distribute deliberately.</b> Shopping is grouped by store.
          The zone tags show where each item should land once you get home.
        </div>
      </Card>

      {SHOPPING.map((s) => (
        <Card key={s.key}>
          <div className="flex items-start gap-2 mb-2">
            <ShoppingCart size={16} className="text-[var(--primary)] mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="font-semibold">{s.label}</div>
              <div className="text-xs text-[var(--ink-soft)]">{s.note}</div>
            </div>
          </div>
          <ul className="space-y-1.5">
            {s.items.map((i) => (
              <li key={i.name} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="w-4 h-4 accent-[var(--primary)]" />
                <span className="flex-1">
                  {i.name}
                  {i.qty && <span className="text-[var(--ink-soft)]"> · {i.qty}</span>}
                </span>
                {i.zoneHint && (
                  <div className="flex gap-0.5 shrink-0">
                    {i.zoneHint.map((z) => {
                      const zone = ZONES.find((x) => x.key === z)!;
                      return (
                        <span
                          key={z}
                          title={zone.label}
                          className="inline-block w-4 h-4 rounded-full border"
                          style={{ backgroundColor: zone.color, borderColor: "rgba(0,0,0,0.2)" }}
                        />
                      );
                    })}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ))}

      <Card className="border-[var(--alert)] bg-[var(--alert-soft)]">
        <div className="flex items-start gap-2 mb-2">
          <AlertTriangle size={16} className="text-[var(--alert)] mt-0.5 shrink-0" />
          <div className="font-bold text-[var(--alert)]">Do not buy</div>
        </div>
        <ul className="text-sm space-y-1">
          {DO_NOT_BUY.map((i) => (
            <li key={i} className="flex gap-2">
              <span className="text-[var(--alert)] shrink-0">✕</span>
              <span>{i}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// ————————————————————————————————————————————————————————
// Routines (Cleaning + PPE + Sun)
// ————————————————————————————————————————————————————————
function RoutinesTab() {
  const [sub, setSub] = useState<"cleaning" | "ppe" | "sun">("cleaning");
  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {(
          [
            ["cleaning", "Cleaning"],
            ["ppe", "PPE"],
            ["sun", "Sun"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setSub(k)}
            className={`flex-1 rounded-xl px-3 py-2 text-sm border ${
              sub === k ? "bg-[var(--ink)] text-[var(--surface)] border-[var(--ink)]" : "border-[var(--border)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {sub === "cleaning" && <CleaningSub />}
      {sub === "ppe" && <PPESub />}
      {sub === "sun" && <SunSub />}
    </div>
  );
}

function CleaningSub() {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs uppercase tracking-widest text-[var(--ink-soft)] font-semibold mb-2">
          Daily — twice-daily high-touch
        </div>
        <div className="space-y-2">
          {CLEANING_DAILY.map((b) => (
            <Card key={b.heading}>
              <div className="font-semibold mb-1.5">{b.heading}</div>
              <ul className="text-sm space-y-1">
                {b.tasks.map((t) => (
                  <li key={t} className="flex gap-2">
                    <CheckCircle2 size={14} className="text-[var(--primary)] shrink-0 mt-0.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>

      <Card className="border-[var(--alert)] bg-[var(--alert-soft)]">
        <div className="flex items-center gap-2 mb-1.5">
          <AlertTriangle size={16} className="text-[var(--alert)]" />
          <div className="font-bold text-[var(--alert)]">Clean immediately when</div>
        </div>
        <ul className="text-sm space-y-1">
          {CLEANING_IMMEDIATE.map((t) => (
            <li key={t} className="flex gap-2">
              <span className="text-[var(--alert)]">•</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div>
        <div className="text-xs uppercase tracking-widest text-[var(--ink-soft)] font-semibold mb-2">
          Every 2–3 days
        </div>
        <Card>
          <ul className="text-sm space-y-1">
            {CLEANING_EVERY_2_3_DAYS.map((t) => (
              <li key={t} className="flex gap-2">
                <CheckCircle2 size={14} className="text-[var(--primary)] shrink-0 mt-0.5" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div>
        <div className="text-xs uppercase tracking-widest text-[var(--ink-soft)] font-semibold mb-2">
          Weekly deep clean
        </div>
        <div className="space-y-2">
          {CLEANING_WEEKLY.map((b) => (
            <Card key={b.heading}>
              <div className="font-semibold mb-1.5">{b.heading}</div>
              <ul className="text-sm space-y-1">
                {b.tasks.map((t) => (
                  <li key={t} className="flex gap-2">
                    <Brush size={14} className="text-[var(--accent)] shrink-0 mt-0.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function PPESub() {
  return (
    <div className="space-y-3">
      <Card>
        <div className="text-sm">
          <b>The task drives the PPE.</b> Routine cleaning is not the same as body-fluid cleanup.
          Use real non-valved P2 / N95 respirators when respirator-level protection is required,
          and fit-check every time.
        </div>
      </Card>

      <div className="space-y-2">
        {PPE_MATRIX.map((p) => (
          <Card key={p.task}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="font-semibold text-sm">{p.task}</div>
              <span
                className={`shrink-0 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${
                  p.who === "patient" ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-soft)] text-[var(--ink)]"
                }`}
              >
                {p.who === "patient" ? "Patient" : "Support"}
              </span>
            </div>
            <div className="text-sm">{p.gear}</div>
            {p.notes && <div className="text-xs text-[var(--ink-soft)] mt-1">{p.notes}</div>}
          </Card>
        ))}
      </div>

      <Card>
        <div className="font-semibold mb-2">Respirator fit-check (every time)</div>
        <ol className="text-sm space-y-1 list-decimal list-inside">
          {RESPIRATOR_FIT_CHECK.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

function SunSub() {
  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <Sun size={16} className="text-[var(--accent)]" />
          <div className="font-semibold">Three-line rule</div>
        </div>
        <ul className="text-sm space-y-1">
          {SUN_RULES.threeLine.map((r) => (
            <li key={r} className="flex gap-2">
              <span>•</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <div className="font-semibold mb-2">Before going outside</div>
        <ul className="text-sm space-y-1">
          {SUN_RULES.beforeOutside.map((r) => (
            <li key={r} className="flex gap-2">
              <CheckCircle2 size={14} className="text-[var(--primary)] shrink-0 mt-0.5" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <div className="font-semibold mb-2">While outside</div>
        <ul className="text-sm space-y-1">
          {SUN_RULES.whileOutside.map((r) => (
            <li key={r} className="flex gap-2">
              <CheckCircle2 size={14} className="text-[var(--primary)] shrink-0 mt-0.5" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="border-[var(--alert)] bg-[var(--alert-soft)]">
        <div className="flex items-center gap-2 mb-1.5">
          <AlertTriangle size={16} className="text-[var(--alert)]" />
          <div className="font-bold text-[var(--alert)]">Escalate if</div>
        </div>
        <ul className="text-sm space-y-1">
          {SUN_RULES.escalate.map((r) => (
            <li key={r} className="flex gap-2">
              <span className="text-[var(--alert)]">•</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// ————————————————————————————————————————————————————————
// Protocols (situational cards)
// ————————————————————————————————————————————————————————
function ProtocolsTab({ initialSlug }: { initialSlug?: string | null }) {
  const [open, setOpen] = useState<string | null>(initialSlug ?? null);

  useEffect(() => {
    if (!initialSlug) return;
    setTimeout(() => {
      document.getElementById(initialSlug)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, [initialSlug]);

  return (
    <div className="space-y-3">
      <Card>
        <div className="text-sm">
          <b>Quick-access protocols.</b> Each card is a short checklist you can tap through
          when a situation hits — spills, visitors, pet accidents, hospital trips, and the
          fever rule.
        </div>
      </Card>

      {PROTOCOLS.map((p) => {
        const Icon = PROTOCOL_ICONS[p.icon];
        const isOpen = open === p.slug;
        return (
          <div key={p.slug} id={p.slug}>
            <button
              onClick={() => setOpen(isOpen ? null : p.slug)}
              className="w-full text-left"
            >
              <Card className={isOpen ? "border-[var(--primary)]" : undefined}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[var(--surface-soft)] flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-[var(--primary)]" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{p.title}</div>
                    <div className="text-xs text-[var(--ink-soft)] mt-0.5">{p.blurb}</div>
                  </div>
                  <div className="text-xs text-[var(--ink-soft)] shrink-0">{isOpen ? "−" : "+"}</div>
                </div>
                {isOpen && (
                  <div className="mt-3 pl-12">
                    <ol className="text-sm space-y-1.5 list-decimal list-outside ml-4">
                      {p.steps.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>
                    {p.alsoSee && p.alsoSee.length > 0 && (
                      <div className="mt-3 text-xs text-[var(--ink-soft)]">
                        Also see:{" "}
                        {p.alsoSee.map((slug, idx) => {
                          const target = PROTOCOLS.find((x) => x.slug === slug);
                          if (!target) return null;
                          return (
                            <span key={slug}>
                              {idx > 0 && ", "}
                              <button
                                className="text-[var(--primary)] underline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpen(slug);
                                  setTimeout(
                                    () => document.getElementById(slug)?.scrollIntoView({ behavior: "smooth", block: "start" }),
                                    50,
                                  );
                                }}
                              >
                                {target.title}
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </button>
          </div>
        );
      })}
    </div>
  );
}

const PROTOCOL_ICONS = {
  droplet: Droplet,
  pet: Dog,
  "user-x": UserX,
  building: Building2,
  broom: Brush,
  flag: Flag,
} as const;
