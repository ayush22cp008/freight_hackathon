export async function getServerTime(): Promise<string> {
  const res = await fetch('/api/server-time', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to fetch server time');
  }
  const data = await res.json();
  return data.timestamp;
}
