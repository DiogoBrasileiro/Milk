import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { MilkBatch } from '../types';
import { formatDateTime, formatTimeRemaining } from '../utils/formatters';
import { X, Printer, QrCode, Download, Check } from 'lucide-react';
import QRCode from 'qrcode';
import { CONSERVATION_PROTOCOLS } from '../constants/medicalProtocols';

export const MilkBottleLabelModal: React.FC = () => {
  const { closeModal, modalData, baby, isNightMode } = useApp();
  const batch: MilkBatch = modalData?.batch;
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const labelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (batch) {
      // Generate QR Code containing deep-link URL / payload
      const qrPayload = JSON.stringify({
        app: 'MilkFlowBaby',
        batchId: batch.id,
        baby: baby.name,
        extractedAt: batch.extractedAt,
        volumeMl: batch.currentVolumeMl,
        expiresAt: batch.expiresAt,
        location: batch.location,
      });

      QRCode.toDataURL(qrPayload, { width: 140, margin: 1 })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR code error:', err));
    }
  }, [batch, baby]);

  if (!batch) return null;

  const expiryInfo = formatTimeRemaining(batch.expiresAt);
  const protocol = CONSERVATION_PROTOCOLS[batch.protocolId] || CONSERVATION_PROTOCOLS.brasil_ms;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border transition-colors ${
          isNightMode ? 'bg-[#0e131d] border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">Etiqueta com QR Code</h2>
              <p className="text-xs text-slate-400">Pronta para impressão e colagem no frasco</p>
            </div>
          </div>
          <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Physical Label Card */}
        <div className="py-4">
          <div
            ref={labelRef}
            id="printable-milk-label"
            className="p-5 rounded-2xl bg-white text-slate-900 border-2 border-slate-900 shadow-md font-sans space-y-3"
          >
            {/* Top header of label */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
              <div>
                <span className="text-[10px] font-black tracking-widest uppercase text-blue-700 block">
                  MILKFLOW BABY • LEITE MATERNO
                </span>
                <h3 className="text-lg font-black tracking-tight leading-tight">{baby.name}</h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-500 block">FRASCO / LOTE</span>
                <span className="text-sm font-mono font-black bg-slate-900 text-white px-2 py-0.5 rounded">
                  {batch.containerNumber ? `Frasco #${batch.containerNumber}` : `#${batch.id}`}
                </span>
              </div>
            </div>

            {/* Pot Name, Lid Color & Tag info if present */}
            {(batch.containerName || batch.containerTag || batch.containerColor) && (
              <div className="bg-slate-100 p-2 rounded-lg flex items-center justify-between text-xs font-bold border border-slate-200 flex-wrap gap-1">
                <div className="flex items-center gap-1.5">
                  {batch.containerColor && (
                    <span
                      className="w-3 h-3 rounded-full inline-block border border-black/20"
                      style={{ backgroundColor: batch.containerColor }}
                      title={`Cor da Tampa: ${batch.containerColor}`}
                    />
                  )}
                  {batch.containerName && (
                    <span>Pote: <strong>{batch.containerName}</strong></span>
                  )}
                </div>
                {batch.containerTag && (
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-300 text-[11px] font-black text-blue-700">
                    🏷️ {batch.containerTag}
                  </span>
                )}
              </div>
            )}

            {/* Middle info with QR Code */}
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block">DATA / HORA ORDENHA:</span>
                  <strong className="text-slate-900 font-mono">{formatDateTime(batch.extractedAt)}</strong>
                </div>

                <div className="flex gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block">VOLUME:</span>
                    <strong className="text-base font-black text-blue-700">{batch.currentVolumeMl} ml</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block">DESTINO:</span>
                    <strong className="text-xs uppercase font-bold text-slate-800">{batch.location}</strong>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 block">USAR PREFERENCIALMENTE ANTES DE:</span>
                  <strong className="text-xs font-mono font-bold text-rose-700">
                    {formatDateTime(batch.expiresAt)}
                  </strong>
                </div>
              </div>

              {/* QR Code image */}
              <div className="shrink-0 flex flex-col items-center">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt={`QR #${batch.id}`} className="w-24 h-24 rounded border border-slate-300" />
                ) : (
                  <div className="w-24 h-24 bg-slate-100 animate-pulse rounded" />
                )}
                <span className="text-[9px] font-mono font-bold text-slate-400 mt-0.5">SCAN ME</span>
              </div>
            </div>

            {/* Bottom note & protocol badge */}
            <div className="pt-2 border-t border-dashed border-slate-300 flex items-center justify-between text-[9px] text-slate-500">
              <span>Coletado por: {batch.caregiverName || 'Mãe'}</span>
              <span className="font-semibold">{protocol.name.split('—')[0]}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={closeModal}
            className={`flex-1 py-3 rounded-2xl font-bold text-xs border ${
              isNightMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            Fechar
          </button>
          <button
            onClick={handlePrint}
            className="flex-2 py-3 rounded-2xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-98"
          >
            <Printer className="w-4 h-4" />
            Imprimir Etiqueta
          </button>
        </div>
      </div>
    </div>
  );
};
