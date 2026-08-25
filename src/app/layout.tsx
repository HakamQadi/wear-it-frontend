import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/context/CartContext';

export const metadata: Metadata = { title: 'Wear It — See the fit before it arrives', description: 'Modern clothes with a simple virtual try-on preview.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><CartProvider>{children}</CartProvider></body></html>;
}
