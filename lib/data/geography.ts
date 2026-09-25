import type { District, Region } from "@/lib/types";

/** Ghana's 16 administrative regions (2019 reorganisation) — spec §4. */
export const REGIONS: Region[] = [
  { id: "gar", name: "Greater Accra", capital: "Accra" },
  { id: "ash", name: "Ashanti", capital: "Kumasi" },
  { id: "cen", name: "Central", capital: "Cape Coast" },
  { id: "eas", name: "Eastern", capital: "Koforidua" },
  { id: "wes", name: "Western", capital: "Sekondi-Takoradi" },
  { id: "wno", name: "Western North", capital: "Sefwi Wiawso" },
  { id: "vol", name: "Volta", capital: "Ho" },
  { id: "oti", name: "Oti", capital: "Dambai" },
  { id: "nor", name: "Northern", capital: "Tamale" },
  { id: "sav", name: "Savannah", capital: "Damongo" },
  { id: "nea", name: "North East", capital: "Nalerigu" },
  { id: "uea", name: "Upper East", capital: "Bolgatanga" },
  { id: "uwe", name: "Upper West", capital: "Wa" },
  { id: "bon", name: "Bono", capital: "Sunyani" },
  { id: "boe", name: "Bono East", capital: "Techiman" },
  { id: "aha", name: "Ahafo", capital: "Goaso" },
];

const d = (regionId: string, names: string[]): District[] =>
  names.map((name) => ({
    id: `${regionId}-${name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/-+$/, "")}`,
    regionId,
    name,
  }));

/** A representative subset of Ghana's 261 MMDAs; extend as tenants onboard. */
export const DISTRICTS: District[] = [
  ...d("gar", ["Accra Metro", "Tema Metro", "La Dade-Kotopon", "Ga East", "Adentan", "Ledzokuku"]),
  ...d("ash", ["Kumasi Metro", "Obuasi Municipal", "Ejisu Municipal", "Asokore Mampong", "Mampong Municipal"]),
  ...d("cen", ["Cape Coast Metro", "KEEA Municipal", "Mfantseman", "Awutu Senya East"]),
  ...d("eas", ["New Juaben South", "Akuapem North", "Birim Central", "Kwahu West"]),
  ...d("wes", ["Sekondi-Takoradi Metro", "Tarkwa-Nsuaem", "Ahanta West"]),
  ...d("wno", ["Sefwi Wiawso", "Bibiani-Anhwiaso-Bekwai"]),
  ...d("vol", ["Ho Municipal", "Keta Municipal", "Hohoe Municipal", "Ketu South"]),
  ...d("oti", ["Krachi East", "Nkwanta South", "Jasikan"]),
  ...d("nor", ["Tamale Metro", "Yendi Municipal", "Savelugu Municipal"]),
  ...d("sav", ["West Gonja", "East Gonja", "Bole"]),
  ...d("nea", ["East Mamprusi", "West Mamprusi"]),
  ...d("uea", ["Bolgatanga Municipal", "Bawku Municipal", "Kassena-Nankana"]),
  ...d("uwe", ["Wa Municipal", "Lawra Municipal", "Jirapa Municipal"]),
  ...d("bon", ["Sunyani Municipal", "Berekum Municipal", "Dormaa Central"]),
  ...d("boe", ["Techiman Municipal", "Kintampo North", "Atebubu-Amantin"]),
  ...d("aha", ["Asunafo North", "Asutifi North", "Tano South"]),
];

/** Towns used to name generated (aggregate-only) schools, keyed by district. */
export const DISTRICT_TOWNS: Record<string, string[]> = {
  "Accra Metro": ["Osu", "Adabraka", "Kaneshie", "Korle Bu", "Dansoman"],
  "Tema Metro": ["Tema", "Community 8", "Sakumono", "Kpone"],
  "La Dade-Kotopon": ["Labone", "Cantonments", "La"],
  "Ga East": ["Abokobi", "Dome", "Taifa"],
  Adentan: ["Adenta", "Ashaley Botwe", "Frafraha"],
  Ledzokuku: ["Teshie", "Nungua", "Burma Camp"],
  "Kumasi Metro": ["Adum", "Bantama", "Asafo", "Nhyiaeso", "Suame"],
  "Obuasi Municipal": ["Obuasi", "Tutuka", "Anyinam"],
  "Ejisu Municipal": ["Ejisu", "Juaben", "Kwamo"],
  "Asokore Mampong": ["Asokore", "Aboabo"],
  "Mampong Municipal": ["Mampong", "Nsuta"],
  "Cape Coast Metro": ["Cape Coast", "Abura", "Pedu"],
  "KEEA Municipal": ["Elmina", "Komenda"],
  Mfantseman: ["Saltpond", "Mankessim", "Anomabo"],
  "Awutu Senya East": ["Kasoa", "Opeikuma"],
  "New Juaben South": ["Koforidua", "Effiduase"],
  "Akuapem North": ["Akropong", "Mampong-Akuapem", "Larteh"],
  "Birim Central": ["Akim Oda", "Achiase"],
  "Kwahu West": ["Nkawkaw", "Mpraeso"],
  "Sekondi-Takoradi Metro": ["Takoradi", "Sekondi", "Kojokrom"],
  "Tarkwa-Nsuaem": ["Tarkwa", "Nsuaem"],
  "Ahanta West": ["Agona Nkwanta", "Dixcove"],
  "Sefwi Wiawso": ["Sefwi Wiawso", "Dwinase"],
  "Bibiani-Anhwiaso-Bekwai": ["Bibiani", "Sefwi Bekwai"],
  "Ho Municipal": ["Ho", "Sokode", "Klefe"],
  "Keta Municipal": ["Keta", "Anloga", "Abor"],
  "Hohoe Municipal": ["Hohoe", "Gbi"],
  "Ketu South": ["Aflao", "Denu"],
  "Krachi East": ["Dambai", "Asukawkaw"],
  "Nkwanta South": ["Nkwanta", "Brewaniase"],
  Jasikan: ["Jasikan", "Okadjakrom"],
  "Tamale Metro": ["Tamale", "Kalpohin", "Vittin"],
  "Yendi Municipal": ["Yendi", "Gnani"],
  "Savelugu Municipal": ["Savelugu", "Diare"],
  "West Gonja": ["Damongo", "Busunu"],
  "East Gonja": ["Salaga", "Kpandai"],
  Bole: ["Bole", "Tinga"],
  "East Mamprusi": ["Nalerigu", "Gambaga"],
  "West Mamprusi": ["Walewale", "Wulugu"],
  "Bolgatanga Municipal": ["Bolgatanga", "Zuarungu"],
  "Bawku Municipal": ["Bawku", "Missiga"],
  "Kassena-Nankana": ["Navrongo", "Paga"],
  "Wa Municipal": ["Wa", "Kperisi"],
  "Lawra Municipal": ["Lawra", "Eremon"],
  "Jirapa Municipal": ["Jirapa", "Ullo"],
  "Sunyani Municipal": ["Sunyani", "Abesim"],
  "Berekum Municipal": ["Berekum", "Jinijini"],
  "Dormaa Central": ["Dormaa Ahenkro", "Aboabo No. 2"],
  "Techiman Municipal": ["Techiman", "Tuobodom"],
  "Kintampo North": ["Kintampo", "Babatokuma"],
  "Atebubu-Amantin": ["Atebubu", "Amantin"],
  "Asunafo North": ["Goaso", "Mim"],
  "Asutifi North": ["Kenyasi", "Ntotroso"],
  "Tano South": ["Bechem", "Techimantia"],
};

export const regionById = (id: string) => REGIONS.find((r) => r.id === id);
export const districtById = (id: string) => DISTRICTS.find((x) => x.id === id);
/** "Accra Metro, Greater Accra" — tolerant of schools imported without a location. */
export function locationLabel(s: { districtId: string; regionId: string }): string {
  const d = districtById(s.districtId)?.name;
  const r = regionById(s.regionId)?.name;
  if (d && r) return `${d}, ${r}`;
  if (r) return `${r} · district not set`;
  return "Location not set";
}

export const districtsOf =(regionId: string) => DISTRICTS.filter((x) => x.regionId === regionId);
