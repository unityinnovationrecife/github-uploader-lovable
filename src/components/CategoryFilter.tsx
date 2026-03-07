import { Category } from '@/types';

interface CategoryFilterProps {
  selectedCategory: Category;
  onSelectCategory: (category: Category) => void;
}

const categories: { name: Category; emoji: string }[] = [
  { name: 'Todos', emoji: '🔥' },
  { name: 'Coxinhas', emoji: '🍗' },
  { name: 'Salgados', emoji: '🌭' },
  { name: 'Porções', emoji: '🧀' },
  { name: 'Pastel', emoji: '🥟' },
  { name: 'Bebidas', emoji: '🥤' },
];

export default function CategoryFilter({ selectedCategory, onSelectCategory }: CategoryFilterProps) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((cat) => (
        <button
          key={cat.name}
          onClick={() => onSelectCategory(cat.name)}
          className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-300 ${
            selectedCategory === cat.name
              ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/25 scale-105'
              : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)] hover:border-orange-500/40'
          }`}
        >
          <span className="text-base">{cat.emoji}</span>
          {cat.name}
        </button>
      ))}
    </div>
  );
}
