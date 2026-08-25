export type Category = { _id: string; name: string; slug: string; description: string; isActive: boolean };
export type Product = {
  _id: string; name: string; slug: string; description: string; categoryId: Category | string;
  price: number; compareAtPrice?: number; images: string[]; tryOnOverlayUrl: string; sizes: string[];
  colors: string[]; stock: number; featured: boolean; isActive: boolean; tags: string[];
};
export type SiteContent = { brandName: string; heroTitle: string; heroSubtitle: string; heroCta: string; announcement: string; footerText: string };
export type CartItem = { product: Product; size: string; color: string; quantity: number };
export type Order = {
  _id: string; orderNumber: string; customerName: string; email: string; phone: string; address: string; city: string;
  notes?: string; subtotal: number; delivery: number; total: number; status: string; createdAt: string;
  items: { productId: string; name: string; unitPrice: number; quantity: number; size: string; color: string; image?: string }[];
};
