export async function sendWebhook(url: string | null, event: string, payload: any) {
  if (!url) return;

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,           
        timestamp: new Date().toISOString(),
        data: payload 
      }),
      signal: AbortSignal.timeout(3000)
    });

  } catch (error) {
    console.error("Webhook Failed:", error);
  }
}