export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: Category;
  emoji: string;
  hasFlavors?: boolean;
  availableFlavors?: string[];
  maxFlavors?: number;
  allowDuplicateFlavors?: boolean;
}

export interface CartItem extends Product {
  quantity: number;
  selectedFlavors?: string[];
  selectedAcomp?: string[];
}

export type Category =
  | 'Todos'
  | 'Coxinhas'
  | 'Salgados'
  | 'Porções'
  | 'Pastel'
  | 'Bebidas';
