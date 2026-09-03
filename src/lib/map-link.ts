/** A plain Google Maps search link built from free text — no API key needed, opens in a new tab. */
export function mapSearchUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}
