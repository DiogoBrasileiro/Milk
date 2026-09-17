/**
 * Utilitário de Lembretes, Alarmes Sonoros e Integração com Celular para Próxima Mamada
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Toca um sinal sonoro suave e afetuoso para alertar a hora da mamada (acorde harmônico)
 */
export function playGentleFeedingChime() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // Acorde C Maior (Dó, Mi, Sol, Dó)
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.15);

      gain.gain.setValueAtTime(0, now + index * 0.15);
      gain.gain.linearRampToValueAtTime(0.18, now + index * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.15 + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + index * 0.15);
      osc.stop(now + index * 0.15 + 1.3);
    });
  } catch (err) {
    console.warn('AudioContext not allowed or supported yet:', err);
  }
}

/**
 * Solicita permissão e agenda ou dispara notificação no celular / navegador
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }
  return false;
}

/**
 * Envia notificação local imediata
 */
export function sendLocalNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: 'milkflow-feeding-reminder',
      });
    } catch (e) {
      console.warn('Error displaying notification:', e);
    }
  }
}

/**
 * Cria e baixa um evento de calendário (.ics) com alarme embutido no celular
 */
export function exportFeedingToCalendar(babyName: string, expectedTimeIso: string, volumeMl?: number) {
  const startDate = new Date(expectedTimeIso);
  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30 min duration

  const formatIcsDate = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const title = `🍼 Mamada - ${babyName}`;
  const description = `Lembrete da próxima mamada do bebê ${babyName}.${volumeMl ? ` Volume sugerido: ${volumeMl}ml.` : ''}`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MilkFlow Baby//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:feeding-${Date.now()}@milkflow.app`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(startDate)}`,
    `DTEND:${formatIcsDate(endDate)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT5M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Lembrete de Mamada MilkFlow',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });

  // Se o dispositivo suportar Web Share API com arquivos, oferece compartilhamento nativo
  if (navigator.canShare && navigator.canShare({ files: [new File([blob], 'mamada.ics', { type: 'text/calendar' })] })) {
    const file = new File([blob], 'mamada.ics', { type: 'text/calendar' });
    navigator.share({
      title,
      text: description,
      files: [file],
    }).catch(() => {
      downloadBlob(blob, `lembrete-mamada-${babyName.toLowerCase()}.ics`);
    });
  } else {
    downloadBlob(blob, `lembrete-mamada-${babyName.toLowerCase()}.ics`);
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
