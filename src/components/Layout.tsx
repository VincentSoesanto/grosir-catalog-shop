// The frame around every page: header, the page itself, footer, phone bottom menu and the WhatsApp button.
import { useEffect } from 'react'
import { matchPath, Outlet, useLocation } from 'react-router-dom'
import { SHOP, whatsappLink } from '../lib/shop'
import BottomNav from './BottomNav'
import { WhatsAppIcon } from './BrandIcons'
import Footer from './Footer'
import Header from './Header'

export default function Layout() {
  const { pathname } = useLocation()
  // The product page has its own bottom bar (+ Keranjang) and its own WhatsApp button
  const isProductPage = matchPath('/produk/:id', pathname) !== null
  // The cart has its own "Pesan via WhatsApp" button: no second WhatsApp bubble there
  const showWhatsAppBubble = !isProductPage && pathname !== '/keranjang'

  // Opening another page starts at the top (not where the previous page was scrolled)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className={`flex min-h-screen flex-col md:pb-0 ${isProductPage ? 'pb-20' : 'pb-16'}`}>
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      {!isProductPage && <BottomNav />}

      {showWhatsAppBubble && (
        <a
          href={whatsappLink(`Halo ${SHOP.name}, saya mau tanya produk.`)}
          target="_blank"
          rel="noreferrer"
          aria-label="Chat WhatsApp"
          className="fixed bottom-20 right-4 z-30 grid size-13 place-items-center rounded-full bg-[#25d366] text-white shadow-lg transition hover:scale-105 md:bottom-6 md:right-6 md:size-14"
        >
          <WhatsAppIcon className="size-7" />
        </a>
      )}
    </div>
  )
}
