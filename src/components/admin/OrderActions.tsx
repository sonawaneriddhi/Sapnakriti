"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ORDER_STATUS_FLOW } from "@/lib/config";

export default function OrderActions({
  orderId,
  orderStatus,
  courierName,
  courierTrackingNumber,
  paid,
}: {
  orderId: string;
  orderStatus: string;
  courierName: string;
  courierTrackingNumber: string;
  paid: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(orderStatus);
  const [courier, setCourier] = useState(courierName);
  const [tracking, setTracking] = useState(courierTrackingNumber);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const currentIdx = ORDER_STATUS_FLOW.indexOf(orderStatus as (typeof ORDER_STATUS_FLOW)[number]);
  const options = ORDER_STATUS_FLOW.filter((_, i) => i > currentIdx);

  async function save() {
    setBusy(true);
    setMsg("");
    const body: Record<string, string> = { courierName: courier, courierTrackingNumber: tracking };
    if (status !== orderStatus && status !== "") body.orderStatus = status;
    const res = await fetch(`/api/admin/orders/${orderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg(data.error ?? "Could not update");
    setMsg("Saved");
    router.refresh();
  }

  async function resend(channel?: "email" | "whatsapp") {
    setBusy(true);
    setMsg("");
    const res = await fetch(`/api/admin/orders/${orderId}/notify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? "Resend attempted. Check the delivery status above." : data.error ?? "Could not resend");
    router.refresh();
  }

  if (!paid) return <p className="text-sm text-espresso/60">Only paid orders can be fulfilled.</p>;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label htmlFor="status" className="field-label">Move order to</label>
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} disabled={options.length === 0} className="field">
            <option value={orderStatus}>{orderStatus} (current)</option>
            {options.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="courier" className="field-label">Courier</label>
            <input id="courier" value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="e.g. Delhivery" className="field" />
          </div>
          <div>
            <label htmlFor="tracking" className="field-label">Tracking number</label>
            <input id="tracking" value={tracking} onChange={(e) => setTracking(e.target.value)} className="field" />
          </div>
        </div>
        <button onClick={save} disabled={busy} className="btn-primary">Save</button>
      </div>

      <div className="border-t border-sand pt-5">
        <p className="field-label">Resend confirmation (invoice + packing code)</p>
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} onClick={() => resend()} className="btn-outline !px-4 !py-2 !text-xs">Email + WhatsApp</button>
          <button disabled={busy} onClick={() => resend("email")} className="btn-outline !px-4 !py-2 !text-xs">Email only</button>
          <button disabled={busy} onClick={() => resend("whatsapp")} className="btn-outline !px-4 !py-2 !text-xs">WhatsApp only</button>
        </div>
      </div>
      {msg && <p role="status" className="text-sm text-olive">{msg}</p>}
    </div>
  );
}
