/** Google Maps sted-/profilvisning. Prefererer place id, deretter navn/adresse (ikke bare coords). */
export function mapsPlaceUrl(bar: {
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  googlePlaceId?: string;
}): string {
  if (bar.googlePlaceId) {
    const query = encodeURIComponent(bar.name);
    return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${encodeURIComponent(bar.googlePlaceId)}`;
  }
  // Navn/adresse — coords åpner bare en pin uten Google-stedinfo
  const q = [bar.name, bar.address?.trim()].filter(Boolean).join(", ");
  if (q.length > 0) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }
  if (bar.lat != null && bar.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${bar.lat},${bar.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Trondheim")}`;
}
