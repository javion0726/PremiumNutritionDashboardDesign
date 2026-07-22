// ─── Food search ──────────────────────────────────────────────────────────────
// Two sources merged, ported from the vanilla app:
//  • USDA FoodData Central via our Netlify Function proxy (key stays server-side;
//    set USDA_API_KEY in the Netlify site's environment variables)
//  • Open Food Facts (keyless) — better for branded/packaged foods
// If the proxy isn't configured, USDA silently drops out and OFF still works.

export type FoodResult = {
  name: string; brand: string
  cal: number; prot: number; carb: number; fat: number
  per: string
}

const FOOD_PROXY = '/.netlify/functions/food-search'

type UsdaNutrient = { nutrientName?: string; value?: number }
type UsdaFood = {
  description?: string; brandName?: string; brandOwner?: string
  servingSize?: number; servingSizeUnit?: string
  foodNutrients?: UsdaNutrient[]
}

async function fetchUSDA(q: string): Promise<FoodResult[]> {
  const res = await fetch(`${FOOD_PROXY}?q=${encodeURIComponent(q)}&mode=full`)
  if (!res.ok) throw new Error('USDA proxy error')
  const data = await res.json()
  return ((data.foods ?? []) as UsdaFood[]).map(food => {
    const n: Partial<FoodResult> = {}
    for (const nu of food.foodNutrients ?? []) {
      if (nu.nutrientName === 'Energy') n.cal = Math.round(nu.value || 0)
      if (nu.nutrientName === 'Protein') n.prot = Math.round((nu.value || 0) * 10) / 10
      if (nu.nutrientName === 'Carbohydrate, by difference') n.carb = Math.round((nu.value || 0) * 10) / 10
      if (nu.nutrientName === 'Total lipid (fat)') n.fat = Math.round((nu.value || 0) * 10) / 10
    }
    return {
      name: food.description ?? '', brand: food.brandName || food.brandOwner || '',
      cal: n.cal ?? 0, prot: n.prot ?? 0, carb: n.carb ?? 0, fat: n.fat ?? 0,
      per: food.servingSize ? `per ${food.servingSize}${food.servingSizeUnit || 'g'}` : 'per 100g',
    }
  })
}

type OffProduct = {
  product_name?: string; brands?: string
  nutriments?: Record<string, number>
}

async function fetchOFF(q: string): Promise<FoodResult[]> {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=6`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Open Food Facts error')
  const data = await res.json()
  return ((data.products ?? []) as OffProduct[])
    .filter(p => p.product_name && p.nutriments)
    .map(p => ({
      name: p.product_name!, brand: p.brands ? p.brands.split(',')[0].trim() : '',
      cal: Math.round(p.nutriments!['energy-kcal_100g'] || 0),
      prot: Math.round((p.nutriments!['proteins_100g'] || 0) * 10) / 10,
      carb: Math.round((p.nutriments!['carbohydrates_100g'] || 0) * 10) / 10,
      fat: Math.round((p.nutriments!['fat_100g'] || 0) * 10) / 10,
      per: 'per 100g',
    }))
}

export async function searchFood(q: string): Promise<{ items: FoodResult[]; allFailed: boolean }> {
  const [usda, off] = await Promise.allSettled([fetchUSDA(q), fetchOFF(q)])
  const items = [
    ...(usda.status === 'fulfilled' ? usda.value : []),
    ...(off.status === 'fulfilled' ? off.value : []),
  ]
  return { items, allFailed: usda.status === 'rejected' && off.status === 'rejected' }
}
