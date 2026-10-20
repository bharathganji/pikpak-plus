import { PremiumProduct } from "@/types/api";

interface QuotaExtraPackagesProps {
  activeProducts: PremiumProduct[];
}

export function QuotaExtraPackages({
  activeProducts,
}: QuotaExtraPackagesProps) {
  if (!activeProducts || activeProducts.length === 0) {
    return null;
  }

  return (
    <div className="pt-4 space-y-2 border-t border-dashed">
      <div className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wider">
        Extra Premium Packages
      </div>
      {activeProducts.map((product, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between text-xs bg-primary/5 p-2 rounded-md border border-primary/10 shadow-sm"
        >
          <div className="flex flex-col">
            <span className="font-medium text-foreground">
              {product.product_name}
            </span>
            <span className="text-[10px] text-muted-foreground">
              Expires: {new Date(product.expire_time).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
