'use client';

import { useState } from 'react';

const emptyTeeth = () => {
  const t: Record<string, string> = {};
  for (const arch of ['U', 'L']) {
    for (let i = 1; i <= 8; i++) t[`${arch}${i}`] = 'none';
  }
  return t;
};

export function AdminCreateOrder({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [arch, setArch] = useState<'top' | 'bottom' | 'both'>('top');
  const [tier, setTier] = useState<'friend' | 'founding' | 'standard'>('friend');
  const [overrideUsd, setOverrideUsd] = useState('');
  const [fulfillment, setFulfillment] = useState<
    'kit_mail' | 'local_impression' | 'dentist_scan'
  >('local_impression');
  const [note, setNote] = useState('');
  const [markDeposit, setMarkDeposit] = useState(true);
  const [markBalance, setMarkBalance] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Simple: top 6 plain for quick friend/in-person create
  function teethPayload() {
    const teeth = emptyTeeth();
    if (arch !== 'bottom') {
      for (const id of ['U2', 'U3', 'U4', 'U5', 'U6', 'U7']) teeth[id] = 'plain';
    }
    if (arch !== 'top') {
      for (const id of ['L2', 'L3', 'L4', 'L5', 'L6', 'L7']) teeth[id] = 'plain';
    }
    return teeth;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone: phone || null,
          arch,
          teeth: teethPayload(),
          tier,
          fulfillment,
          priceOverrideCents:
            tier === 'friend' && overrideUsd
              ? Math.round(Number(overrideUsd) * 100)
              : null,
          markDepositPaid: markDeposit,
          markBalancePaid: markBalance,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setMsg(
        `Created ${data.tier} order: ${data.orderUrl}${
          !markDeposit
            ? ' Open the order and use Send payment link to email a Stripe deposit URL.'
            : ''
        }`,
      );
      onCreated();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-6 rounded-lg border border-border p-4">
      <h2 className="font-display text-lg text-silver-bright">Create order</h2>
      <p className="mt-1 text-sm text-text-muted">
        Friends &amp; in-person. Skips Stripe when you mark paid. Friend never uses a founding
        slot. Default teeth = top/bottom 6 plain (edit in builder later if needed).
      </p>
      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          required
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-border bg-bg px-3 py-2 text-sm"
        />
        <input
          required
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-border bg-bg px-3 py-2 text-sm"
        />
        <input
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="rounded-md border border-border bg-bg px-3 py-2 text-sm"
        />
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as typeof tier)}
          className="rounded-md border border-border bg-bg px-3 py-2 text-sm"
        >
          <option value="friend">friend</option>
          <option value="founding">founding</option>
          <option value="standard">standard</option>
        </select>
        <select
          value={arch}
          onChange={(e) => setArch(e.target.value as typeof arch)}
          className="rounded-md border border-border bg-bg px-3 py-2 text-sm"
        >
          <option value="top">top</option>
          <option value="bottom">bottom</option>
          <option value="both">both</option>
        </select>
        <select
          value={fulfillment}
          onChange={(e) => setFulfillment(e.target.value as typeof fulfillment)}
          className="rounded-md border border-border bg-bg px-3 py-2 text-sm"
        >
          <option value="local_impression">local impression</option>
          <option value="kit_mail">kit mail</option>
          <option value="dentist_scan">dentist scan</option>
        </select>
        {tier === 'friend' && (
          <input
            required
            type="number"
            step="0.01"
            placeholder="Manual price USD"
            value={overrideUsd}
            onChange={(e) => setOverrideUsd(e.target.value)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-sm sm:col-span-2"
          />
        )}
        <input
          required
          placeholder="Required note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="rounded-md border border-border bg-bg px-3 py-2 text-sm sm:col-span-2"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={markDeposit}
            onChange={(e) => setMarkDeposit(e.target.checked)}
          />
          Mark deposit paid
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={markBalance}
            onChange={(e) => setMarkBalance(e.target.checked)}
          />
          Mark balance paid
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-silver-bright px-3 py-2 text-sm font-semibold text-bg sm:col-span-2"
        >
          {loading ? 'Creating…' : 'Create order'}
        </button>
      </form>
      {msg && <p className="mt-2 text-sm text-ok break-all">{msg}</p>}
    </section>
  );
}
