export function isValidIPv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    const n = parseInt(part, 10);
    return !Number.isNaN(n) && n >= 0 && n <= 255 && String(n) === part;
  });
}

export function maskApiKey(key: string): string {
  if (key.length <= 12) return '***';
  return `${key.slice(0, 10)}...${key.slice(-4)}`;
}

export function formatIP(ip: string): string {
  return ip
    .split('.')
    .map((octet) => octet.padStart(3, ' '))
    .join('.');
}

export function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 127) return true;
  return false;
}
