"use client";

import { X } from "lucide-react";

export function ErpModal({
  title,
  children,
  footer,
  onClose,
  wide = false
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <section className={`flex max-h-[96dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-2xl ${wide ? "sm:max-w-3xl" : "sm:max-w-xl"}`}>
        <div className="flex shrink-0 items-center justify-between border-b border-[#eef1f6] px-4 py-4 sm:px-6 sm:py-5">
          <h2 className="text-xl font-bold text-[#071124]">{title}</h2>
          <button className="rounded-lg p-2 text-[#667085] hover:bg-[#f6f7fb]" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>
        {footer && <div className="shrink-0 border-t border-[#eef1f6] bg-white px-4 py-4 sm:px-6">{footer}</div>}
      </section>
    </div>
  );
}
