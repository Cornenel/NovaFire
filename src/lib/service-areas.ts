export type Province = "Mpumalanga" | "Limpopo";

export type ServiceArea = {
  /** URL slug for /areas/<slug> */
  slug: string;
  /** Display name used in titles and headings */
  name: string;
  province: Province;
  /** Short unique local angle for SEO body copy */
  focus: string;
  /** Typical site types in this town */
  commonSites: string[];
};

export const SERVICE_AREAS: ServiceArea[] = [
  {
    slug: "hoedspruit",
    name: "Hoedspruit",
    province: "Limpopo",
    focus:
      "Safari lodges, game reserves and hospitality sites that need scheduled extinguisher and hose-reel servicing without disrupting guest operations.",
    commonSites: ["Lodges", "Reserves", "Staff villages", "Retail"],
  },
  {
    slug: "phalaborwa",
    name: "Phalaborwa",
    province: "Limpopo",
    focus:
      "Mining-support, industrial yards and town commercial properties requiring portable extinguisher servicing plus hydrant and hose-reel support.",
    commonSites: ["Industrial yards", "Warehouses", "Offices", "Retail"],
  },
  {
    slug: "mbombela",
    name: "Mbombela",
    province: "Mpumalanga",
    focus:
      "Commercial buildings, estates and industrial facilities across Mbombela that need a fire extinguisher service company and equipment supplier on one schedule.",
    commonSites: ["Offices", "Estates", "Warehouses", "Schools"],
  },
  {
    slug: "hazyview",
    name: "Hazyview",
    province: "Mpumalanga",
    focus:
      "Hospitality corridors and tourism businesses around Hazyview needing portable extinguisher servicing, supply and documented maintenance.",
    commonSites: ["Lodges", "Guest houses", "Retail", "Restaurants"],
  },
  {
    slug: "hectorspruit",
    name: "Hectorspruit",
    province: "Mpumalanga",
    focus:
      "Transport, agri and roadside commercial sites that need reliable extinguisher servicing and replacement supply between Nelspruit and the border route.",
    commonSites: ["Farms", "Depots", "Workshops", "Retail"],
  },
  {
    slug: "komatipoort",
    name: "Komatipoort",
    province: "Mpumalanga",
    focus:
      "Border-town logistics, agri packing and commercial premises requiring extinguisher servicing, supply and fixed equipment support.",
    commonSites: ["Logistics", "Packhouses", "Offices", "Retail"],
  },
  {
    slug: "wit-rivier",
    name: "Wit Rivier (White River)",
    province: "Mpumalanga",
    focus:
      "Estates, schools and light commercial properties in White River needing portable extinguisher programmes and equipment supply.",
    commonSites: ["Estates", "Schools", "Offices", "Retail"],
  },
  {
    slug: "acornhoek",
    name: "Acornhoek",
    province: "Mpumalanga",
    focus:
      "Community facilities, clinics and commercial sites that need practical extinguisher servicing and straightforward equipment supply.",
    commonSites: ["Clinics", "Schools", "Retail", "Offices"],
  },
  {
    slug: "bushbuckridge",
    name: "Bushbuckridge",
    province: "Mpumalanga",
    focus:
      "Municipal-area businesses and institutions across Bushbuckridge needing scheduled fire extinguisher servicing and replacements.",
    commonSites: ["Institutions", "Retail", "Offices", "Schools"],
  },
  {
    slug: "sabie",
    name: "Sabie",
    province: "Mpumalanga",
    focus:
      "Forestry-town hospitality and commercial premises that need extinguisher servicing, hose reels and documented compliance support.",
    commonSites: ["Lodges", "Retail", "Workshops", "Offices"],
  },
  {
    slug: "graskop",
    name: "Graskop",
    province: "Mpumalanga",
    focus:
      "Tourism and retail sites in Graskop that need portable extinguisher servicing and supply without long downtime.",
    commonSites: ["Guest houses", "Retail", "Restaurants", "Offices"],
  },
  {
    slug: "tzaneen",
    name: "Tzaneen",
    province: "Limpopo",
    focus:
      "Agri, packing and town commercial facilities around Tzaneen needing fire extinguisher servicing, supply and fixed equipment maintenance.",
    commonSites: ["Packhouses", "Farms", "Warehouses", "Retail"],
  },
  {
    slug: "letsitele",
    name: "Letsitele",
    province: "Limpopo",
    focus:
      "Citrus and agri operations that need extinguisher programmes, hose-reel servicing and equipment supply aligned to site audits.",
    commonSites: ["Packhouses", "Farms", "Workshops", "Offices"],
  },
  {
    slug: "giyani",
    name: "Giyani",
    province: "Limpopo",
    focus:
      "Commercial and institutional sites in Giyani needing a dependable fire extinguisher service company and local supply support.",
    commonSites: ["Offices", "Schools", "Retail", "Clinics"],
  },
  {
    slug: "thohoyandou",
    name: "Thohoyandou",
    province: "Limpopo",
    focus:
      "Campus, retail and commercial properties requiring portable extinguisher servicing, replacements and compliance documentation.",
    commonSites: ["Campuses", "Retail", "Offices", "Institutions"],
  },
  {
    slug: "polokwane",
    name: "Polokwane",
    province: "Limpopo",
    focus:
      "Industrial, warehouse and commercial facilities in Polokwane that need extinguisher servicing plus supply of portable and fixed fire equipment.",
    commonSites: ["Warehouses", "Factories", "Offices", "Retail"],
  },
  {
    slug: "musina",
    name: "Musina",
    province: "Limpopo",
    focus:
      "Border logistics and commercial sites needing scheduled extinguisher servicing, hydrant support and equipment supply.",
    commonSites: ["Logistics", "Depots", "Retail", "Offices"],
  },
  {
    slug: "louis-trichardt",
    name: "Louis Trichardt (Makhado)",
    province: "Limpopo",
    focus:
      "Town commercial, agri and light industrial sites across Makhado needing extinguisher servicing and supply.",
    commonSites: ["Retail", "Farms", "Workshops", "Offices"],
  },
  {
    slug: "mokopane",
    name: "Mokopane",
    province: "Limpopo",
    focus:
      "Mining-support, industrial and commercial premises in Mokopane that need fire extinguisher servicing and equipment supply.",
    commonSites: ["Industrial yards", "Warehouses", "Offices", "Retail"],
  },
];

export function getServiceArea(slug: string): ServiceArea | undefined {
  return SERVICE_AREAS.find((a) => a.slug === slug);
}
