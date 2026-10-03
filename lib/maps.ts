/** Google Maps sted-/profilvisning. Prefererer place id, deretter coords, deretter navn. */
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
  if (bar.lat != null && bar.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${bar.lat},${bar.lng}`;
  }
  const q = bar.address?.trim() || `${bar.name} Trondheim`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
