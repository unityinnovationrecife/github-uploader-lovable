import { useState, useMemo, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import Header from '@/components/Header';
import HeroBanner from '@/components/HeroBanner';
import HowItWorks from '@/components/HowItWorks';
import ClosedStoreBanner from '@/components/ClosedStoreBanner';
import WhatsAppButton from '@/components/WhatsAppButton';
import CategoryFilter from '@/components/CategoryFilter';
import ProductCard from '@/components/ProductCard';
import CartSidebar from '@/components/CartSidebar';
import CartFloatingButton from '@/components/CartFloatingButton';
import CheckoutModal from '@/components/CheckoutModal';
import PastelFlavorModal from '@/components/PastelFlavorModal';
import Footer from '@/components/Footer';
import { Category, Product } from '@/types';
import { supabase } from '@/integrations/supabase/client';

export default function HomeClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [acompanhamentos, setAcompanhamentos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [pastelProduct, setPastelProduct] = useState<Product | null>(null);
  const [isPastelModalOpen, setIsPastelModalOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: rawProducts } = await supabase
          .from('products')
          .select('*')
          .order('display_order', { ascending: true });

        const { data: rawAcomp } = await supabase
          .from('acompanhamentos')
          .select('*')
          .order('display_order', { ascending: true });

        const mapped: Product[] = (rawProducts || []).map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: Number(p.price),
          image: p.image,
          category: p.category as Product['category'],
          emoji: p.emoji,
          hasFlavors: p.has_flavors || false,
          maxFlavors: p.max_flavors || undefined,
          availableFlavors: p.available_flavors || undefined,
          allowDuplicateFlavors: p.allow_duplicate_flavors || false,
          available: p.visible !== false,
        }));

        setProducts(mapped);
        setAcompanhamentos((rawAcomp || []).map((a) => a.name));
      } catch (err) {
        console.error('Erro ao buscar produtos:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredProducts = useMemo(() => {
    let result = products;
    if (selectedCategory !== 'Todos') {
      result = result.filter((p) => p.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }
    return result;
  }, [selectedCategory, searchQuery, products]);

  const handleSelectFlavors = (product: Product) => {
    setPastelProduct(product);
    setIsPastelModalOpen(true);
  };

  const handleClosePastelModal = () => {
    setIsPastelModalOpen(false);
    setPastelProduct(null);
  };

  const handleCategorySelect = (cat: Category) => {
    setSelectedCategory(cat);
    setSearchQuery('');
  };

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] transition-colors duration-300">
      <Header />
      <HeroBanner />

      {/* Closed store alert */}
      <ClosedStoreBanner />

      {/* Products Section */}
      <main id="products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        {/* Section Header */}
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] mb-2">
            Nosso{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
              Cardápio
            </span>
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-muted)]">
            Escolha seus itens favoritos e faça seu pedido
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar produto... ex: coxinha, pastel, batata"
              className="w-full pl-11 pr-10 py-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/15 transition-all"
            />
            {isSearching && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-all"
                aria-label="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <CategoryFilter
            selectedCategory={selectedCategory}
            onSelectCategory={handleCategorySelect}
          />
        </div>

        {/* Active search info */}
        {isSearching && !loading && (
          <div className="mb-4 flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <Search className="w-3.5 h-3.5" />
            <span>
              {filteredProducts.length === 0
                ? 'Nenhum produto encontrado para'
                : `${filteredProducts.length} ${filteredProducts.length === 1 ? 'produto encontrado' : 'produtos encontrados'} para`}
              {' '}
              <span className="font-semibold text-[var(--text-primary)]">"{searchQuery}"</span>
            </span>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/3] bg-[var(--bg-secondary)]" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-[var(--bg-secondary)] rounded w-3/4" />
                  <div className="h-3 bg-[var(--bg-secondary)] rounded w-full" />
                  <div className="h-6 bg-[var(--bg-secondary)] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Products Grid */}
        {!loading && filteredProducts.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {filteredProducts.map((product, index) => (
              <div
                key={product.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.04}s` }}
              >
                <ProductCard
                  product={product}
                  onSelectFlavors={handleSelectFlavors}
                />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-6xl mb-4">{isSearching ? '🔍' : '😕'}</p>
            <p className="text-lg text-[var(--text-muted)]">
              {isSearching
                ? `Nenhum produto encontrado para "${searchQuery}"`
                : 'Nenhum produto encontrado nessa categoria'}
            </p>
            {isSearching && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-5 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
              >
                Limpar busca
              </button>
            )}
          </div>
        )}
      </main>

      <HowItWorks />
      <Footer />

      {/* Overlays */}
      <CartSidebar />
      <CartFloatingButton />
      <CheckoutModal />
      <PastelFlavorModal
        product={pastelProduct}
        isOpen={isPastelModalOpen}
        onClose={handleClosePastelModal}
        acompanhamentos={acompanhamentos}
      />
      <WhatsAppButton />
    </div>
  );
}
