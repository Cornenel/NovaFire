export type Province = "Mpumalanga" | "Limpopo";

export type ServiceArea = {
  /** URL slug for /areas/<slug> */
  slug: string;
  /** Display name used in titles and headings */
  name: string;
  province: Province;
};

export const SERVICE_AREAS: ServiceArea[] = [
  { slug: "hoedspruit", name: "Hoedspruit", province: "Limpopo" },
  { slug: "phalaborwa", name: "Phalaborwa", province: "Limpopo" },
  { slug: "mbombela", name: "Mbombela", province: "Mpumalanga" },
  { slug: "hazyview", name: "Hazyview", province: "Mpumalanga" },
  { slug: "hectorspruit", name: "Hectorspruit", province: "Mpumalanga" },
  { slug: "komatipoort", name: "Komatipoort", province: "Mpumalanga" },
  { slug: "wit-rivier", name: "Wit Rivier (White River)", province: "Mpumalanga" },
  { slug: "acornhoek", name: "Acornhoek", province: "Mpumalanga" },
  { slug: "bushbuckridge", name: "Bushbuckridge", province: "Mpumalanga" },
  { slug: "sabie", name: "Sabie", province: "Mpumalanga" },
  { slug: "graskop", name: "Graskop", province: "Mpumalanga" },
  { slug: "tzaneen", name: "Tzaneen", province: "Limpopo" },
  { slug: "letsitele", name: "Letsitele", province: "Limpopo" },
  { slug: "giyani", name: "Giyani", province: "Limpopo" },
  { slug: "thohoyandou", name: "Thohoyandou", province: "Limpopo" },
  { slug: "polokwane", name: "Polokwane", province: "Limpopo" },
  { slug: "musina", name: "Musina", province: "Limpopo" },
  { slug: "louis-trichardt", name: "Louis Trichardt (Makhado)", province: "Limpopo" },
  { slug: "mokopane", name: "Mokopane", province: "Limpopo" },
];

export function getServiceArea(slug: string): ServiceArea | undefined {
  return SERVICE_AREAS.find((a) => a.slug === slug);
}

