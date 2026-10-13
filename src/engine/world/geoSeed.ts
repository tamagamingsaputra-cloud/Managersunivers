/**
 * Data geografi awal: negara dan kota nyata (koordinat perkiraan, cukup untuk penempatan di peta).
 * Ini seed kecil untuk tahap fondasi, BUKAN dataset dunia lengkap.
 * Tahap peta (Prompt 04) menggantinya dengan Natural Earth + daftar kota yang dibundel.
 * Hanya geografi yang nyata; semua klub, atlet, dan perusahaan dibuat fiktif.
 */

export interface GeoSeedCity {
  name: string;
  lat: number;
  lon: number;
}

export interface GeoSeedCountry {
  iso2: string;
  name: string;
  cities: readonly GeoSeedCity[];
}

export const GEO_SEED: readonly GeoSeedCountry[] = [
  { iso2: 'ID', name: 'Indonesia', cities: [
    { name: 'Jakarta', lat: -6.2088, lon: 106.8456 },
    { name: 'Surabaya', lat: -7.2575, lon: 112.7521 },
    { name: 'Bandung', lat: -6.9175, lon: 107.6191 },
    { name: 'Medan', lat: 3.5952, lon: 98.6722 },
  ] },
  { iso2: 'GB', name: 'Britania Raya', cities: [
    { name: 'London', lat: 51.5072, lon: -0.1276 },
    { name: 'Manchester', lat: 53.4808, lon: -2.2426 },
  ] },
  { iso2: 'ES', name: 'Spanyol', cities: [
    { name: 'Madrid', lat: 40.4168, lon: -3.7038 },
    { name: 'Barcelona', lat: 41.3874, lon: 2.1686 },
  ] },
  { iso2: 'IT', name: 'Italia', cities: [
    { name: 'Roma', lat: 41.9028, lon: 12.4964 },
    { name: 'Milan', lat: 45.4642, lon: 9.19 },
  ] },
  { iso2: 'DE', name: 'Jerman', cities: [
    { name: 'Berlin', lat: 52.52, lon: 13.405 },
    { name: 'Munich', lat: 48.1351, lon: 11.582 },
  ] },
  { iso2: 'FR', name: 'Prancis', cities: [
    { name: 'Paris', lat: 48.8566, lon: 2.3522 },
    { name: 'Lyon', lat: 45.764, lon: 4.8357 },
  ] },
  { iso2: 'BR', name: 'Brasil', cities: [
    { name: 'São Paulo', lat: -23.5505, lon: -46.6333 },
    { name: 'Rio de Janeiro', lat: -22.9068, lon: -43.1729 },
  ] },
  { iso2: 'AR', name: 'Argentina', cities: [{ name: 'Buenos Aires', lat: -34.6037, lon: -58.3816 }] },
  { iso2: 'JP', name: 'Jepang', cities: [
    { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
    { name: 'Osaka', lat: 34.6937, lon: 135.5023 },
  ] },
  { iso2: 'US', name: 'Amerika Serikat', cities: [
    { name: 'New York', lat: 40.7128, lon: -74.006 },
    { name: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
  ] },
  { iso2: 'NG', name: 'Nigeria', cities: [{ name: 'Lagos', lat: 6.5244, lon: 3.3792 }] },
  { iso2: 'EG', name: 'Mesir', cities: [{ name: 'Kairo', lat: 30.0444, lon: 31.2357 }] },
  { iso2: 'AU', name: 'Australia', cities: [{ name: 'Sydney', lat: -33.8688, lon: 151.2093 }] },
  { iso2: 'TR', name: 'Turki', cities: [{ name: 'Istanbul', lat: 41.0082, lon: 28.9784 }] },
  { iso2: 'IN', name: 'India', cities: [{ name: 'Mumbai', lat: 19.076, lon: 72.8777 }] },
  { iso2: 'MX', name: 'Meksiko', cities: [{ name: 'Mexico City', lat: 19.4326, lon: -99.1332 }] },
  { iso2: 'ZA', name: 'Afrika Selatan', cities: [{ name: 'Johannesburg', lat: -26.2041, lon: 28.0473 }] },
];
