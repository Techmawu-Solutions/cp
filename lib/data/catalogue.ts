import type { CatalogueProgramme, CatalogueSubject } from "@/lib/types";

/** Stable catalogue IDs derived from codes, so seeded school records can link to them. */
export const catProgrammeId = (code: string) => `cat_p_${code}`;
export const catSubjectId = (code: string) => `cat_s_${code}`;

const P = (code: string, name: string, description: string): CatalogueProgramme => ({ id: catProgrammeId(code), code, name, description, active: true });
const S = (code: string, name: string, category: CatalogueSubject["category"], programmeCodes: string[] = [], description = ""): CatalogueSubject => ({
  id: catSubjectId(code),
  code,
  name,
  category,
  programmeCodes,
  description: description || (category === "core" ? "Core subject taken by all students." : `Elective subject.`),
  active: true,
});

/** GES senior high school programmes (spec §17). */
export const CATALOGUE_PROGRAMMES: CatalogueProgramme[] = [
  P("GSCI", "General Science", "Physics, Chemistry, Biology and Elective Mathematics."),
  P("GART", "General Arts", "Government, Literature, Economics, Geography, History and languages."),
  P("BUS", "Business", "Accounting, Business Management, Economics and Costing."),
  P("HEC", "Home Economics", "Food & Nutrition, Management in Living, Clothing & Textiles."),
  P("VART", "Visual Arts", "Graphic Design, Picture Making, Ceramics, Sculpture and Textiles."),
  P("AGRIC", "Agricultural Science", "General Agriculture, Animal Husbandry, Crop Husbandry and Chemistry."),
  P("TECH", "Technical", "Technical Drawing, Applied Electricity, Building Construction and Metalwork."),
  P("STEM", "STEM", "Science, Technology, Engineering and Mathematics with Computing and Robotics."),
];

export const CATALOGUE_SUBJECTS: CatalogueSubject[] = [
  S("ENG", "English Language", "core"),
  S("MATH", "Core Mathematics", "core"),
  S("ISCI", "Integrated Science", "core"),
  S("SOC", "Social Studies", "core"),
  S("ICT", "ICT", "core", [], "Information and Communication Technology."),
  S("PE", "Physical Education", "core"),
  S("PHY", "Physics", "elective", ["GSCI", "STEM"]),
  S("CHEM", "Chemistry", "elective", ["GSCI", "AGRIC", "STEM"]),
  S("BIO", "Biology", "elective", ["GSCI", "STEM"]),
  S("EMATH", "Elective Mathematics", "elective", ["GSCI", "BUS", "STEM", "TECH"]),
  S("GOV", "Government", "elective", ["GART"]),
  S("LIT", "Literature-in-English", "elective", ["GART"]),
  S("ECON", "Economics", "elective", ["GART", "BUS"]),
  S("GEOG", "Geography", "elective", ["GART"]),
  S("HIST", "History", "elective", ["GART"]),
  S("CRS", "Christian Religious Studies", "elective", ["GART"]),
  S("IRS", "Islamic Religious Studies", "elective", ["GART"]),
  S("FRE", "French", "elective", ["GART"]),
  S("TWI", "Ghanaian Language (Twi)", "elective", ["GART"]),
  S("EWE", "Ghanaian Language (Ewe)", "elective", ["GART"]),
  S("FACC", "Financial Accounting", "elective", ["BUS"]),
  S("BMGT", "Business Management", "elective", ["BUS"]),
  S("CACC", "Cost Accounting", "elective", ["BUS"]),
  S("FN", "Food & Nutrition", "elective", ["HEC"]),
  S("MIL", "Management in Living", "elective", ["HEC"]),
  S("CT", "Clothing & Textiles", "elective", ["HEC"]),
  S("GKA", "General Knowledge in Art", "elective", ["HEC", "VART"]),
  S("GD", "Graphic Design", "elective", ["VART"]),
  S("PM", "Picture Making", "elective", ["VART"]),
  S("CER", "Ceramics", "elective", ["VART"]),
  S("SCUL", "Sculpture", "elective", ["VART"]),
  S("GAGRIC", "General Agriculture", "elective", ["AGRIC"]),
  S("ANH", "Animal Husbandry", "elective", ["AGRIC"]),
  S("CROP", "Crop Husbandry", "elective", ["AGRIC"]),
  S("TD", "Technical Drawing", "elective", ["TECH"]),
  S("AE", "Applied Electricity", "elective", ["TECH"]),
  S("BC", "Building Construction", "elective", ["TECH"]),
  S("COMP", "Computing", "elective", ["STEM"]),
];
