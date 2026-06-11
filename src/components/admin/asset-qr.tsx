"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, X } from "lucide-react";

/** QR label preview for an asset – encodes the qr_token scanned by the tech app. */

export function AssetQr({
  qrToken,
  assetCode,
  label,
}: {
  qrToken: string;
  assetCode: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
        aria-label={`Show QR code for ${assetCode}`}
      >
        <QrCode className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 text-center max-w-[280px] w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-700"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <QRCodeSVG value={qrToken} size={200} className="mx-auto" />
            <p className="font-mono font-bold text-zinc-900 mt-3">{assetCode}</p>
            <p className="text-xs text-zinc-500">{label}</p>
            <p className="text-[10px] text-zinc-400 mt-2">
              NovaFire · novafire.co.za
            </p>
          </div>
        </div>
      )}
    </>
  );
}
