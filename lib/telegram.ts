// Lightweight Telegram notifier. No-ops silently if env vars are missing so the
// RSVP flow never fails because of a notification problem.
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export function telegramConfigured(): boolean {
  return Boolean(TOKEN && CHAT_ID);
}

export async function sendTelegram(text: string): Promise<void> {
  if (!telegramConfigured()) return;
  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
  } catch (err) {
    // Never let a notification error bubble up.
    console.error('Telegram notify failed:', err);
  }
}
