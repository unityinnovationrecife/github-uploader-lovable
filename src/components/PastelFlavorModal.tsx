import { X, Check, Plus, Minus } from 'lucide-react';
import { Product } from '@/types';
import { useCartStore } from '@/store/cart-store';
import { useState } from 'react';

interface PastelFlavorModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  acompanhamentos: string[];
}

export default function PastelFlavorModal({ product, isOpen, onClose, acompanhamentos }: PastelFlavorModalProps) {
  const { addItem } = useCartStore();
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [flavorCounts, setFlavorCounts] = useState<Record<string, number>>({});
  const [selectedAcomp, setSelectedAcomp] = useState<string[]>([]);
  const maxFlavors = product?.maxFlavors || 3;
  const allowDuplicates = product?.allowDuplicateFlavors ?? false;

  const totalSelected = allowDuplicates
    ? Object.values(flavorCounts).reduce((sum, count) => sum + count, 0)
    : selectedFlavors.length;

  const toggleFlavor = (flavor: string) => {
    if (selectedFlavors.includes(flavor)) {
      setSelectedFlavors(selectedFlavors.filter((f) => f !== flavor));
    } else if (selectedFlavors.length < maxFlavors) {
      setSelectedFlavors([...selectedFlavors, flavor]);
    }
  };

  const incrementFlavor = (flavor: string) => {
    const current = flavorCounts[flavor] || 0;
    if (totalSelected < maxFlavors) {
      setFlavorCounts({ ...flavorCounts, [flavor]: current + 1 });
    }
  };

  const decrementFlavor = (flavor: string) => {
    const current = flavorCounts[flavor] || 0;
    if (current > 0) {
      const newCounts = { ...flavorCounts, [flavor]: current - 1 };
      if (newCounts[flavor] === 0) delete newCounts[flavor];
      setFlavorCounts(newCounts);
    }
  };

  const toggleAcomp = (acomp: string) => {
    if (selectedAcomp.includes(acomp)) {
      setSelectedAcomp(selectedAcomp.filter((a) => a !== acomp));
    } else {
      setSelectedAcomp([...selectedAcomp, acomp]);
    }
  };

  const handleConfirm = () => {
    if (product && totalSelected === maxFlavors) {
      let flavors: string[];
      if (allowDuplicates) {
        flavors = [];
        for (const [flavor, count] of Object.entries(flavorCounts)) {
          for (let i = 0; i < count; i++) {
            flavors.push(flavor);
          }
        }
      } else {
        flavors = selectedFlavors;
      }
      addItem(product, flavors, selectedAcomp);
      setSelectedFlavors([]);
      setFlavorCounts({});
      setSelectedAcomp([]);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedFlavors([]);
    setFlavorCounts({});
    setSelectedAcomp([]);
    onClose();
  };

  if (!product) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`fixed inset-0 z-[70] flex items-center justify-center p-4 transition-all duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className={`w-full max-w-md max-h-[90vh] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl overflow-hidden transform transition-all duration-300 flex flex-col ${
            isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)] flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {product.emoji} Escolha {maxFlavors} Sabores
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {totalSelected} de {maxFlavors} selecionados
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-xl bg-[var(--bg-primary)] hover:opacity-80 transition-colors"
            >
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1">
            {/* Progress bar */}
            <div className="px-5 pt-4">
              <div className="h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-300"
                  style={{ width: `${(totalSelected / maxFlavors) * 100}%` }}
                />
              </div>
            </div>

            {/* Flavors */}
            <div className="p-5 space-y-2">
              {allowDuplicates ? (
                product.availableFlavors?.map((flavor) => {
                  const count = flavorCounts[flavor] || 0;
                  return (
                    <div
                      key={flavor}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 ${
                        count > 0
                          ? 'bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/50'
                          : 'bg-[var(--bg-primary)] border-[var(--border-color)]'
                      }`}
                    >
                      <span className={`text-sm font-medium ${count > 0 ? 'text-orange-500' : 'text-[var(--text-secondary)]'}`}>
                        {flavor}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => decrementFlavor(flavor)}
                          disabled={count === 0}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                            count > 0
                              ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] hover:border-orange-500/50 active:scale-90'
                              : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)] opacity-40 cursor-not-allowed'
                          }`}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-[var(--text-primary)]">
                          {count}
                        </span>
                        <button
                          onClick={() => incrementFlavor(flavor)}
                          disabled={totalSelected >= maxFlavors}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90 ${
                            totalSelected >= maxFlavors
                              ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)] opacity-40 cursor-not-allowed'
                              : 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/25'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {product.availableFlavors?.map((flavor) => {
                    const isSelected = selectedFlavors.includes(flavor);
                    const isDisabled = !isSelected && selectedFlavors.length >= maxFlavors;

                    return (
                      <button
                        key={flavor}
                        onClick={() => toggleFlavor(flavor)}
                        disabled={isDisabled}
                        className={`flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                          isSelected
                            ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/50 text-orange-500 dark:text-orange-300 border'
                            : isDisabled
                            ? 'bg-[var(--bg-primary)] text-[var(--text-muted)] opacity-50 border border-[var(--border-color)] cursor-not-allowed'
                            : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-orange-500/40'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-gradient-to-r from-orange-500 to-red-500'
                              : 'bg-[var(--bg-secondary)] border border-[var(--border-color)]'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        {flavor}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Acompanhamentos - apenas para Pastel */}
            {product.category === 'Pastel' && (
              <div className="px-5 pb-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)] mb-3">
                  🥗 Acompanhamentos <span className="text-[10px] font-normal">(opcional)</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {acompanhamentos.map((acomp) => {
                    const isSelected = selectedAcomp.includes(acomp);
                    return (
                      <button
                        key={acomp}
                        type="button"
                        onClick={() => toggleAcomp(acomp)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                          isSelected
                            ? 'bg-orange-500/20 text-orange-500 dark:text-orange-300 border border-orange-500/40'
                            : 'bg-[var(--bg-primary)] text-[var(--text-muted)] border border-[var(--border-color)] hover:border-orange-500/30'
                        }`}
                      >
                        {acomp}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-[var(--border-color)] flex gap-3 flex-shrink-0">
            <button
              onClick={handleClose}
              className="flex-1 py-3 rounded-xl bg-[var(--bg-primary)] text-[var(--text-muted)] font-semibold hover:opacity-80 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={totalSelected !== maxFlavors}
              className={`flex-1 py-3 rounded-xl font-bold transition-all duration-300 ${
                totalSelected === maxFlavors
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-[var(--bg-primary)] text-[var(--text-muted)] cursor-not-allowed'
              }`}
            >
              Adicionar • R$ {product.price.toFixed(2).replace('.', ',')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
