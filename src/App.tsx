// The list of pages (routes). New pages get added here as we build them.
import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { CartProvider } from './lib/cart'
import { StoreSettingsProvider } from './lib/storeSettings'
import { ToastProvider } from './lib/toast'
import ComingSoonPage from './pages/ComingSoonPage'
import AboutPage from './pages/AboutPage'
import CartPage from './pages/CartPage'
import CategoriesPage from './pages/CategoriesPage'
import HomePage from './pages/HomePage'
import ProductPage from './pages/ProductPage'
import ShopPage from './pages/ShopPage'

// The admin area is downloaded only when someone opens /admin
const AdminApp = lazy(() => import('./admin/AdminApp'))

export default function App() {
  return (
    <StoreSettingsProvider>
      <CartProvider>
        <BrowserRouter>
          <ToastProvider>
            <Routes>
              <Route path="admin/*" element={<Suspense fallback={null}><AdminApp /></Suspense>} />
              <Route element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="produk" element={<ShopPage />} />
                <Route path="produk/:id" element={<ProductPage />} />
                <Route path="kategori" element={<CategoriesPage />} />
                <Route path="kategori/:slug" element={<ShopPage />} />
                <Route path="keranjang" element={<CartPage />} />
                <Route path="tentang" element={<AboutPage />} />
                <Route path="*" element={<ComingSoonPage />} />
              </Route>
            </Routes>
          </ToastProvider>
        </BrowserRouter>
      </CartProvider>
    </StoreSettingsProvider>
  )
}
