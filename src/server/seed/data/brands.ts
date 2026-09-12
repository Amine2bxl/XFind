export interface SeedBrand {
  name: string
  aliases: string[]
  imageSeed?: string
}

export const SEED_BRANDS: SeedBrand[] = [
  { name: 'Nike', aliases: ['Nike Sportswear', 'Nike SB', 'Jordan', 'Air Jordan', 'Jordans'] },
  { name: 'Adidas', aliases: ['Adidas Originals', 'Three Stripes', 'Yeezy'] },
  { name: 'New Balance', aliases: ['NB', 'N Balance'] },
  { name: 'Prada', aliases: ['Prada Milano', 'Miuccia Prada'] },
  { name: 'Gucci', aliases: ['Gucci Milano', 'GG'] },
  { name: 'Stone Island', aliases: ['Stoney', 'Compass'] },
  { name: 'Moncler', aliases: ['Moncler Grenoble', 'Moncler Genius'] },
  { name: 'The North Face', aliases: ['TNF', 'North Face'] },
  { name: 'Supreme', aliases: ['Supreme NY', 'Box Logo'] },
  { name: 'Carhartt', aliases: ['Carhartt WIP', 'Detroit'] },
  { name: 'Ralph Lauren', aliases: ['Polo Ralph Lauren', 'Ralph Lauren Polo', 'PRL'] },
  { name: "Arc'teryx", aliases: ['Arc teryx', 'ArcTeryx', 'Goose'] },
  { name: 'Lacoste', aliases: ['Crocodile', 'L.12.12', 'Lacoste L!VE'] },
  { name: 'Zara', aliases: ['Zara Woman', 'Zara Man', 'Zara Trf'] },
  { name: 'Hermès', aliases: ['Hermes', 'Hermès Paris', 'Birkin', 'Kelly'] },
  { name: "Levi's", aliases: ['Levis', 'Levi Strauss', '501', 'Levis Vintage Clothing'] },
  { name: 'Burberry', aliases: ['Burberry London', 'Burberry Brit', 'Burberry Prorsum'] },
  { name: 'Tommy Hilfiger', aliases: ['Tommy', 'TH', 'Tommy Jeans'] },
]