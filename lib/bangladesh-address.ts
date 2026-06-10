import divisionsData from "@/data/raw/bangladesh/divisions.json"
import districtsData from "@/data/raw/bangladesh/districts.json"
import upazilasData from "@/data/raw/bangladesh/upazilas.json"

export type Division = (typeof divisionsData)[number]
export type District = (typeof districtsData)[number]
export type Upazila = (typeof upazilasData)[number]

const divisions = divisionsData as Division[]
const districts = districtsData as District[]
const upazilas = upazilasData as Upazila[]

const divisionMap = new Map(divisions.map((d) => [d.id, d]))
const districtMap = new Map(districts.map((d) => [d.id, d]))
const upazilaMap = new Map(upazilas.map((u) => [u.id, u]))

const districtsByDivision = new Map<string, District[]>()
const upazilasByDistrict = new Map<string, Upazila[]>()

for (const district of districts) {
  const list = districtsByDivision.get(district.divisionId) ?? []
  list.push(district)
  districtsByDivision.set(district.divisionId, list)
}

for (const upazila of upazilas) {
  const list = upazilasByDistrict.get(upazila.districtId) ?? []
  list.push(upazila)
  upazilasByDistrict.set(upazila.districtId, list)
}

export function getDivisions(): Division[] {
  return divisions
}

export function getDivisionById(id: string): Division | undefined {
  return divisionMap.get(id)
}

export function getDistrictsByDivision(divisionId: string): District[] {
  return districtsByDivision.get(divisionId) ?? []
}

export function getDistrictById(id: string): District | undefined {
  return districtMap.get(id)
}

export function getUpazilasByDistrict(districtId: string): Upazila[] {
  return upazilasByDistrict.get(districtId) ?? []
}

export function getUpazilaById(id: string): Upazila | undefined {
  return upazilaMap.get(id)
}

export function searchDivisions(query: string): Division[] {
  const q = query.toLowerCase()
  return divisions.filter(
    (d) => d.name.toLowerCase().includes(q) || d.nameBn.includes(q)
  )
}

export function searchDistrictsScoped(divisionId: string, query: string): District[] {
  const q = query.toLowerCase()
  return getDistrictsByDivision(divisionId).filter(
    (d) => d.name.toLowerCase().includes(q) || d.nameBn.includes(q)
  )
}

export function searchUpazilasScoped(districtId: string, query: string): Upazila[] {
  const q = query.toLowerCase()
  return getUpazilasByDistrict(districtId).filter(
    (u) => u.name.toLowerCase().includes(q) || u.nameBn.includes(q)
  )
}

export function searchDistricts(query: string): District[] {
  const q = query.toLowerCase()
  return districts.filter(
    (d) => d.name.toLowerCase().includes(q) || d.nameBn.includes(q)
  )
}

export function searchUpazilas(query: string): Upazila[] {
  const q = query.toLowerCase()
  return upazilas.filter(
    (u) => u.name.toLowerCase().includes(q) || u.nameBn.includes(q)
  )
}