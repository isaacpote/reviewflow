"use client";

import { useEffect, useState } from "react";

type GoogleState = {
  googlePlaceId: string | null;
  googleLocationName: string | null;
  reviewLink: string | null;
};

type Location = { placeId: string; name: string; address: string };

export function GoogleBusinessCard({
  businessId,
  onLinkUpdated,
}: {
  businessId: string;
  onLinkUpdated: (link: string) => void;
}) {
  const [state, setState] = useState<GoogleState | null>(null);
  const [picking, setPicking] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/business/${businessId}`)
      .then((r) => r.json())
      .then((data) => {
        setState({
          googlePlaceId: data.business.googlePlaceId,
          googleLocationName: data.business.googleLocationName,
          reviewLink: data.business.reviewLink,
        });
      });
  }, [businessId]);

  async function startPicking() {
    setPicking(true);
    setLoadingLocations(true);
    setError(null);
    try {
      const res = await fetch(`/api/google-business/locations?businessId=${businessId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't load your Google listings.");
      setLocations(data.locations);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingLocations(false);
    }
  }

  async function connect(loc: Location) {
    setConnecting(loc.placeId);
    setError(null);
    try {
      const res = await fetch("/api/google-business/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, placeId: loc.placeId, locationName: loc.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't connect that location.");
      setState({
        googlePlaceId: data.business.googlePlaceId,
        googleLocationName: data.business.googleLocationName,
        reviewLink: data.business.reviewLink,
      });
      onLinkUpdated(data.business.reviewLink);
      setPicking(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setConnecting(null);
    }
  }

  async function disconnect() {
    setError(null);
    try {
      const res = await fetch("/api/google-business/connect", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't disconnect.");
      setState({
        googlePlaceId: data.business.googlePlaceId,
        googleLocationName: data.business.googleLocationName,
        reviewLink: data.business.reviewLink,
      });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!state) return null;

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 p-4 mb-3">
      {state.googlePlaceId ? (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-sm font-medium">{state.googleLocationName}</div>
            <div className="text-xs text-gray-500 mt-0.5">Google Business Profile connected</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide rounded-full px-2 py-1 bg-emerald-500/15 text-emerald-600">
              Connected
            </span>
            <button onClick={disconnect} className="text-xs text-gray-500 underline">
              Disconnect
            </button>
          </div>
        </div>
      ) : picking ? (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-500">
            Pick your listing (confirmed from your Google account, not guessed by search):
          </div>
          {loadingLocations ? (
            <p className="text-sm text-gray-500">Loading your locations…</p>
          ) : (
            <ul className="space-y-1.5">
              {locations.map((loc) => (
                <li key={loc.placeId}>
                  <button
                    onClick={() => connect(loc)}
                    disabled={connecting === loc.placeId}
                    className="w-full text-left rounded-lg border border-black/10 dark:border-white/15 px-3 py-2 hover:border-emerald-500 transition disabled:opacity-60"
                  >
                    <div className="text-sm font-medium">{loc.name}</div>
                    <div className="text-xs text-gray-500">{loc.address}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => setPicking(false)} className="text-xs text-gray-500 underline">
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Not connected — using a manually-entered link below.
          </div>
          <button
            onClick={startPicking}
            className="text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5"
          >
            Connect Google Business Profile
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  );
}
