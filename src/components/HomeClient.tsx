import { useState, useMemo, useEffect } from 'react';
import Header from '@/components/Header';
import HeroBanner from '@/components/HeroBanner';
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
  const [pastelProduct, setPastelProduct] = useState<Product | null>(null);
  const [isPastelModalOpen, setIsPastelModalOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Busca TODOS os produtos (visíveis e esgotados), excluindo apenas os ocultos permanentemente
        // visible=true → disponível | visible=false → esgotado (aparece com badge)
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
          available: p.visible !== false, // visible=false → esgotado
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
    if (selectedCategory === 'Todos') return products;
    return products.filter((p) => p.category === selectedCategory);
  }, [selectedCategory, products]);

  const handleSelectFlavors = (product: Product) => {
    setPastelProduct(product);
    setIsPastelModalOpen(true);
  };

  const handleClosePastelModal = () => {
    setIsPastelModalOpen(false);
    setPastelProduct(null);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] transition-colors duration-300">
      <Header />
      <HeroBanner />

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

        {/* Category Filter */}
        <div className="mb-8">
          <CategoryFilter
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>

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
        {!loading && (
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
            <p className="text-6xl mb-4">😕</p>
            <p className="text-lg text-[var(--text-muted)]">Nenhum produto encontrado nessa categoria</p>
          </div>
        )}
      </main>

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
    </div>
  );
}
