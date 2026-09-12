export interface SeedCategory {
  name: string
  parent?: string
}

export const SEED_CATEGORIES: SeedCategory[] = [
  { name: 'Fashion' },
  { name: 'Shoes', parent: 'Fashion' },
  { name: 'Sneakers', parent: 'Shoes' },
  { name: 'Boots', parent: 'Shoes' },
  { name: 'Clothing', parent: 'Fashion' },
  { name: 'Jackets', parent: 'Clothing' },
  { name: 'Sweatshirts', parent: 'Clothing' },
  { name: 'T-Shirts', parent: 'Clothing' },
  { name: 'Shirts', parent: 'Clothing' },
  { name: 'Jeans', parent: 'Clothing' },
  { name: 'Accessories', parent: 'Fashion' },
  { name: 'Bags', parent: 'Accessories' },
  { name: 'Caps', parent: 'Accessories' },
]