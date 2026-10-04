import type { Country, District, Region, School } from "@/lib/types";

/**
 * Countries the platform serves (spec section 4.1). Ghana is the first; Nigeria and
 * Côte d'Ivoire are demo countries with sample schools so analytics can compare countries.
 */
export const COUNTRIES: Country[] = [
  { id: "gh", code: "GH", name: "Ghana", currency: "GHS", regionLabel: "Region", districtLabel: "District" },
  { id: "ng", code: "NG", name: "Nigeria", currency: "NGN", regionLabel: "State", districtLabel: "LGA" },
  { id: "ci", code: "CI", name: "Côte d'Ivoire", currency: "XOF", regionLabel: "Region", districtLabel: "Department" },
];
export const DEFAULT_COUNTRY = "gh";

/** Ghana's 16 administrative regions (2019 reorganisation) — spec section 4. */
export const REGIONS: Region[] = [
  { id: "gar", countryId: "gh", name: "Greater Accra", capital: "Accra" },
  { id: "ash", countryId: "gh", name: "Ashanti", capital: "Kumasi" },
  { id: "cen", countryId: "gh", name: "Central", capital: "Cape Coast" },
  { id: "eas", countryId: "gh", name: "Eastern", capital: "Koforidua" },
  { id: "wes", countryId: "gh", name: "Western", capital: "Sekondi-Takoradi" },
  { id: "wno", countryId: "gh", name: "Western North", capital: "Sefwi Wiawso" },
  { id: "vol", countryId: "gh", name: "Volta", capital: "Ho" },
  { id: "oti", countryId: "gh", name: "Oti", capital: "Dambai" },
  { id: "nor", countryId: "gh", name: "Northern", capital: "Tamale" },
  { id: "sav", countryId: "gh", name: "Savannah", capital: "Damongo" },
  { id: "nea", countryId: "gh", name: "North East", capital: "Nalerigu" },
  { id: "uea", countryId: "gh", name: "Upper East", capital: "Bolgatanga" },
  { id: "uwe", countryId: "gh", name: "Upper West", capital: "Wa" },
  { id: "bon", countryId: "gh", name: "Bono", capital: "Sunyani" },
  { id: "boe", countryId: "gh", name: "Bono East", capital: "Techiman" },
  { id: "aha", countryId: "gh", name: "Ahafo", capital: "Goaso" },
  // Nigeria: a sample of its 36 states and the FCT.
  { id: "ng-la", countryId: "ng", name: "Lagos", capital: "Ikeja" },
  { id: "ng-fc", countryId: "ng", name: "Federal Capital Territory", capital: "Abuja" },
  { id: "ng-kn", countryId: "ng", name: "Kano", capital: "Kano" },
  { id: "ng-ri", countryId: "ng", name: "Rivers", capital: "Port Harcourt" },
  { id: "ng-oy", countryId: "ng", name: "Oyo", capital: "Ibadan" },
  // Côte d'Ivoire: a sample of its districts.
  { id: "ci-ab", countryId: "ci", name: "Abidjan", capital: "Abidjan" },
  { id: "ci-ya", countryId: "ci", name: "Yamoussoukro", capital: "Yamoussoukro" },
  { id: "ci-vb", countryId: "ci", name: "Vallée du Bandama", capital: "Bouaké" },
  { id: "ci-bs", countryId: "ci", name: "Bas-Sassandra", capital: "San-Pédro" },
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
  ...d("ng-la", ["Ikeja", "Eti-Osa", "Surulere", "Alimosho"]),
  ...d("ng-fc", ["Abuja Municipal", "Bwari", "Gwagwalada"]),
  ...d("ng-kn", ["Kano Municipal", "Nassarawa", "Fagge"]),
  ...d("ng-ri", ["Port Harcourt", "Obio-Akpor", "Eleme"]),
  ...d("ng-oy", ["Ibadan North", "Ibadan South-West", "Ogbomosho North"]),
  ...d("ci-ab", ["Cocody", "Yopougon", "Plateau", "Abobo"]),
  ...d("ci-ya", ["Yamoussoukro", "Attiégouakro"]),
  ...d("ci-vb", ["Bouaké", "Katiola"]),
  ...d("ci-bs", ["San-Pédro", "Soubré", "Sassandra"]),
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

/** A division name inside a sentence: "region", "state", but acronyms stay as they are ("LGA"). */
export const labelWord = (label: string) => (/^[A-Z]{2,}$/.test(label) ? label : label.toLowerCase());

export const countryById = (id: string | undefined) => COUNTRIES.find((c) => c.id === id);
export const regionById = (id: string) => REGIONS.find((r) => r.id === id);
export const regionsOf = (countryId: string) => REGIONS.filter((r) => r.countryId === countryId);
/** A school's country: its own, else its region's, else Ghana (schools imported before countries existed). */
export const countryIdOf = (s: Pick<School, "countryId" | "regionId">) => s.countryId ?? regionById(s.regionId)?.countryId ?? DEFAULT_COUNTRY;
export const countryOf = (s: Pick<School, "countryId" | "regionId">) => countryById(countryIdOf(s))!;
/** Catalogue entries belong to one country's catalogue; entries from before countries existed are Ghana's. */
export const inCatalogueOf = (countryId: string) => (c: { countryId?: string }) => (c.countryId ?? DEFAULT_COUNTRY) === countryId;
export const districtById = (id: string) => DISTRICTS.find((x) => x.id === id);
/** "Accra Metro, Greater Accra, Ghana" — tolerant of schools imported without a location. */
export function locationLabel(s: { districtId: string; regionId: string; countryId?: string }): string {
  const c = countryOf(s);
  const d = districtById(s.districtId)?.name;
  const r = regionById(s.regionId)?.name;
  if (d && r) return `${d}, ${r}, ${c.name}`;
  if (r) return `${r}, ${c.name} · ${labelWord(c.districtLabel)} not set`;
  return `${c.name} · location not set`;
}

export const districtsOf =(regionId: string) => DISTRICTS.filter((x) => x.regionId === regionId);
