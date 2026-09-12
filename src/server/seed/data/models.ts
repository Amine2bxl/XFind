export interface SeedModel {
  brand: string
  name: string
  category: string
  aliases?: string[]
  minPrice: number
  maxPrice: number
  sizes: 'shoes' | 'apparel' | 'jackets' | 'accessory' | 'unisex_S_M_L'
}

export const SEED_MODELS: SeedModel[] = [
  // Nike
  { brand: 'Nike', name: 'Air Max 95', category: 'Sneakers', aliases: ['AM95', 'Air Max 95 Neon'], minPrice: 45, maxPrice: 180, sizes: 'shoes' },
  { brand: 'Nike', name: 'Air Max 90', category: 'Sneakers', aliases: ['AM90'], minPrice: 35, maxPrice: 140, sizes: 'shoes' },
  { brand: 'Nike', name: 'Dunk Low', category: 'Sneakers', aliases: ['Dunk', 'Nike Dunk'], minPrice: 40, maxPrice: 220, sizes: 'shoes' },
  { brand: 'Nike', name: 'Air Force 1', category: 'Sneakers', aliases: ['AF1', 'Air Force One'], minPrice: 30, maxPrice: 120, sizes: 'shoes' },
  { brand: 'Nike', name: "Air Jordan 1", category: 'Sneakers', aliases: ['AJ1', 'Jordan 1', 'Air Jordan 1 Retro'], minPrice: 60, maxPrice: 400, sizes: 'shoes' },
  { brand: 'Nike', name: 'Air Jordan 4', category: 'Sneakers', aliases: ['AJ4', 'Jordan 4'], minPrice: 80, maxPrice: 450, sizes: 'shoes' },
  { brand: 'Nike', name: 'Tech Fleece', category: 'Jackets', minPrice: 35, maxPrice: 110, sizes: 'apparel' },
  { brand: 'Nike', name: 'Windrunner', category: 'Jackets', aliases: ['Aeroloft'], minPrice: 25, maxPrice: 80, sizes: 'apparel' },

  // Adidas
  { brand: 'Adidas', name: 'Samba', category: 'Sneakers', aliases: ['Samba OG', 'Samba Classic'], minPrice: 35, maxPrice: 130, sizes: 'shoes' },
  { brand: 'Adidas', name: 'Gazelle', category: 'Sneakers', minPrice: 30, maxPrice: 110, sizes: 'shoes' },
  { brand: 'Adidas', name: 'Campus 00s', category: 'Sneakers', aliases: ['Campus'], minPrice: 30, maxPrice: 100, sizes: 'shoes' },
  { brand: 'Adidas', name: 'Superstar', category: 'Sneakers', minPrice: 25, maxPrice: 90, sizes: 'shoes' },
  { brand: 'Adidas', name: 'Firebird', category: 'Sweatshirts', minPrice: 20, maxPrice: 70, sizes: 'unisex_S_M_L' },

  // New Balance
  { brand: 'New Balance', name: '550', category: 'Sneakers', aliases: ['NB 550'], minPrice: 40, maxPrice: 150, sizes: 'shoes' },
  { brand: 'New Balance', name: '990v6', category: 'Sneakers', aliases: ['990', 'Made in USA'], minPrice: 80, maxPrice: 220, sizes: 'shoes' },
  { brand: 'New Balance', name: '574', category: 'Sneakers', minPrice: 30, maxPrice: 90, sizes: 'shoes' },

  // Prada
  { brand: 'Prada', name: "America's Cup", category: 'Sneakers', aliases: ['Americas Cup', 'Americas Cup Leather', 'Prada America'], minPrice: 120, maxPrice: 450, sizes: 'shoes' },
  { brand: 'Prada', name: 'Re-Nylon', category: 'Bags', aliases: ['Re-nylon backpack', 'ReNylon'], minPrice: 250, maxPrice: 900, sizes: 'accessory' },

  // Gucci
  { brand: 'Gucci', name: 'Ace', category: 'Sneakers', aliases: ['Ace Sneaker', 'Gucci Ace Bee'], minPrice: 180, maxPrice: 550, sizes: 'shoes' },
  { brand: 'Gucci', name: 'Horsebit', category: 'Bags', aliases: ['GG Marmont'], minPrice: 400, maxPrice: 1200, sizes: 'accessory' },

  // Stone Island
  { brand: 'Stone Island', name: 'Ghost Piece', category: 'Jackets', aliases: ['Ghost jacket', 'Ghost'], minPrice: 150, maxPrice: 600, sizes: 'jackets' },
  { brand: 'Stone Island', name: 'Cargo', category: 'Bags', minPrice: 60, maxPrice: 200, sizes: 'accessory' },

  // Moncler
  { brand: 'Moncler', name: 'Maya', category: 'Jackets', aliases: ['Maya down', 'Maya Jacket'], minPrice: 300, maxPrice: 900, sizes: 'jackets' },
  { brand: 'Moncler', name: 'Armoise', category: 'Jackets', aliases: ['Armoise down'], minPrice: 250, maxPrice: 700, sizes: 'jackets' },

  // The North Face
  { brand: 'The North Face', name: '1996 Nuptse', category: 'Jackets', aliases: ['Nuptse', 'Nuptse Jacket'], minPrice: 80, maxPrice: 280, sizes: 'jackets' },
  { brand: 'The North Face', name: 'Denali', category: 'Jackets', aliases: ['Denali fleece'], minPrice: 40, maxPrice: 140, sizes: 'jackets' },
  { brand: 'The North Face', name: 'Mountain Light', category: 'Jackets', aliases: ['Mountain Light Triclimate'], minPrice: 60, maxPrice: 200, sizes: 'jackets' },

  // Supreme
  { brand: 'Supreme', name: 'Box Logo', category: 'Sweatshirts', aliases: ['Box Logo Hoodie', 'Bogo'], minPrice: 150, maxPrice: 500, sizes: 'unisex_S_M_L' },

  // Carhartt
  { brand: 'Carhartt', name: 'Detroit Jacket', category: 'Jackets', aliases: ['Detroit'], minPrice: 45, maxPrice: 160, sizes: 'jackets' },
  { brand: 'Carhartt', name: 'Chase Hoodie', category: 'Sweatshirts', aliases: ['Carhartt WIP Chase'], minPrice: 35, maxPrice: 100, sizes: 'unisex_S_M_L' },
  { brand: 'Carhartt', name: 'B01', category: 'Jeans', aliases: ['B01 Pant'], minPrice: 40, maxPrice: 110, sizes: 'apparel' },

  // Ralph Lauren
  { brand: 'Ralph Lauren', name: 'Polo', category: 'Shirts', aliases: ['Polo Shirt', 'Classic Polo'], minPrice: 15, maxPrice: 90, sizes: 'apparel' },
  { brand: 'Ralph Lauren', name: 'Bear Sweater', category: 'Sweatshirts', aliases: ['Bear Sweater', 'Teddy Bear Knit'], minPrice: 60, maxPrice: 250, sizes: 'apparel' },
  { brand: 'Ralph Lauren', name: 'Varsity', category: 'Jackets', aliases: ['Letterman'], minPrice: 50, maxPrice: 200, sizes: 'jackets' },

  // Arc'teryx
  { brand: "Arc'teryx", name: 'Atom', category: 'Jackets', aliases: ['Atom LT', 'Atom Jacket'], minPrice: 80, maxPrice: 320, sizes: 'jackets' },
  { brand: "Arc'teryx", name: 'Beta AR', category: 'Jackets', aliases: ['Beta AR Jacket'], minPrice: 150, maxPrice: 550, sizes: 'jackets' },

  // Lacoste
  { brand: 'Lacoste', name: 'L.12.12 Polo', category: 'Shirts', aliases: ['Polo Lacoste', 'Lacoste Polo'], minPrice: 20, maxPrice: 90, sizes: 'apparel' },
  { brand: 'Lacoste', name: 'Crocodile Sweater', category: 'Sweatshirts', aliases: ['Lacoste Sweater', 'Croc Sweater'], minPrice: 30, maxPrice: 140, sizes: 'apparel' },
  { brand: 'Lacoste', name: 'Gazon Trainer', category: 'Sneakers', aliases: ['Lacoste Gazon', 'Gazon'], minPrice: 25, maxPrice: 90, sizes: 'shoes' },

  // Zara
  { brand: 'Zara', name: 'Zara Blazer', category: 'Jackets', aliases: ['Blazer Zara', 'Zara Cropped Blazer'], minPrice: 12, maxPrice: 70, sizes: 'jackets' },
  { brand: 'Zara', name: 'Basic T-Shirt', category: 'T-Shirts', aliases: ['Zara Tee', 'Zara Basic Tee'], minPrice: 4, maxPrice: 25, sizes: 'apparel' },
  { brand: 'Zara', name: 'Zara Wrap Dress', category: 'T-Shirts', aliases: ['Wrap dress'], minPrice: 15, maxPrice: 60, sizes: 'apparel' },

  // Hermès
  { brand: 'Hermès', name: 'Birkin', category: 'Bags', aliases: ['Birkin 25', 'Birkin 30', 'H Birkin'], minPrice: 1500, maxPrice: 9000, sizes: 'accessory' },
  { brand: 'Hermès', name: 'Kelly', category: 'Bags', aliases: ['Kelly 28', 'Kelly Bag', 'H Kelly'], minPrice: 1200, maxPrice: 8000, sizes: 'accessory' },
  { brand: 'Hermès', name: 'Silk Scarf', category: 'Accessories', aliases: ['Carre', 'Carré Hermès', 'Twilly'], minPrice: 150, maxPrice: 700, sizes: 'accessory' },

  // Levi's
  { brand: "Levi's", name: '501', category: 'Jeans', aliases: ['Levi 501', '501 Original'], minPrice: 20, maxPrice: 120, sizes: 'apparel' },
  { brand: "Levi's", name: 'Trucker Jacket', category: 'Jackets', aliases: ['Levi Trucker', 'Denim Jacket'], minPrice: 25, maxPrice: 110, sizes: 'jackets' },

  // Burberry
  { brand: 'Burberry', name: 'Trench Coat', category: 'Jackets', aliases: ['Burberry Trench', 'Heritage Trench'], minPrice: 400, maxPrice: 1600, sizes: 'jackets' },
  { brand: 'Burberry', name: 'Check Scarf', category: 'Accessories', aliases: ['Burberry Scarf', 'Nova Check Scarf'], minPrice: 120, maxPrice: 500, sizes: 'accessory' },

  // Tommy Hilfiger
  { brand: 'Tommy Hilfiger', name: 'Classic Polo', category: 'Shirts', aliases: ['Tommy Polo', 'TH Polo'], minPrice: 12, maxPrice: 60, sizes: 'apparel' },
  { brand: 'Tommy Hilfiger', name: 'Flag Sweater', category: 'Sweatshirts', aliases: ['Tommy Sweater', 'Flag Crewneck'], minPrice: 20, maxPrice: 90, sizes: 'apparel' },
]