// Admin area (/admin): login, product list, edit a product. Loaded only when someone opens /admin,
// so customers never download this code.
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { ImageUp, Loader2, LogOut, Package, Palette, Store } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import { isAdminUid } from '../lib/admin'
import { SHOP } from '../lib/shop'
import { firebaseApp, firebaseConfigured } from '../lib/firebase'
import AdminProductEdit from './AdminProductEdit'
import AdminImport from './AdminImport'
import AdminProducts from './AdminProducts'
import AdminStore from './AdminStore'
import AdminUpdates from './AdminUpdates'
import { INPUT } from './styles'

// No Firebase project set (demo mode): there is nothing to log in to
const auth = firebaseConfigured ? getAuth(firebaseApp) : null

export default function AdminApp() {
  return auth ? <AdminArea /> : <DemoNotice />
}

function DemoNotice() {
  return (
    <div className="grid min-h-screen place-items-center bg-cream p-4">
      <div className="w-full max-w-md space-y-3 rounded-2xl bg-white p-6 text-center shadow-lg ring-1 ring-gray-100">
        <h1 className="text-lg font-bold">Admin (demo mode)</h1>
        <p className="text-sm text-gray-600">
          The admin needs a Firebase project. Copy <code>.env.example</code> to <code>.env.local</code>, fill in your
          Firebase web config and admin UID, then restart <code>npm run dev</code>. See the README.
        </p>
        <Link to="/" className="block text-sm text-gray-500 hover:text-brand-pink">&larr; Kembali ke toko</Link>
      </div>
    </div>
  )
}

function AdminArea() {
  const [user, setUser] = useState<User | null | undefined>(undefined) // undefined = still checking

  useEffect(() => onAuthStateChanged(auth!, setUser), [])

  useEffect(() => {
    document.title = `Admin | ${SHOP.name}`
  }, [])

  if (user === undefined) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-8 animate-spin text-brand-pink" />
      </div>
    )
  }
  if (!user) return <LoginForm />

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-brand-pink-dark text-white shadow">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link to="/admin" className="font-bold">Admin {SHOP.name}</Link>
          <span className="ml-auto hidden text-xs text-pink-100 sm:inline">{user.email}</span>
          <Link to="/admin" className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-sm hover:bg-white/25">
            <Package className="size-4" /> Produk
          </Link>
          <Link to="/admin/impor" className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-sm hover:bg-white/25">
            <ImageUp className="size-4" /> Impor Foto
          </Link>
          <Link to="/admin/tampilan" className="flex items-center gap-1 rounded-full bg-brand-yellow px-3 py-1.5 text-sm font-semibold text-ink hover:brightness-105">
            <Palette className="size-4" /> Tampilan Toko
          </Link>
          <Link to="/" className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-sm hover:bg-white/25">
            <Store className="size-4" /> Lihat toko
          </Link>
          <button onClick={() => signOut(auth!)} className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-sm hover:bg-white/25">
            <LogOut className="size-4" /> Keluar
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {!isAdminUid(user.uid) ? (
          <p className="rounded-xl bg-red-50 p-4 text-red-800 ring-1 ring-red-200">
            Akun ini ({user.email}) belum diberi izin admin. Hubungi pengelola website.
          </p>
        ) : (
          <Routes>
            <Route index element={<AdminProducts />} />
            <Route path="produk/:id" element={<AdminProductEdit />} />
            <Route path="update-harga" element={<AdminUpdates />} />
            <Route path="tampilan" element={<AdminStore />} />
            <Route path="impor" element={<AdminImport />} />
          </Routes>
        )}
      </main>
    </div>
  )
}

const LOGIN_ERRORS: Record<string, string> = {
  'auth/invalid-credential': 'Email atau password salah.',
  'auth/invalid-email': 'Format email salah.',
  'auth/too-many-requests': 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.',
  'auth/network-request-failed': 'Tidak ada internet.',
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function login(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth!, email.trim(), password)
    } catch (err) {
      const code = (err as { code?: string }).code ?? ''
      setError(LOGIN_ERRORS[code] ?? 'Gagal masuk. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-cream p-4">
      <form onSubmit={login} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
        <img src="/img/logo.svg" alt={SHOP.name} width="320" height="165" className="mx-auto h-14 w-auto" />
        <h1 className="text-center text-lg font-bold">Masuk Admin</h1>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" className={INPUT} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className={INPUT} />
        </label>
        {error && <p className="rounded-lg bg-red-50 p-2.5 text-sm text-red-800">{error}</p>}
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-pink py-2.5 font-semibold text-white disabled:opacity-60">
          {busy && <Loader2 className="size-4 animate-spin" />} Masuk
        </button>
        <Link to="/" className="block text-center text-sm text-gray-500 hover:text-brand-pink">← Kembali ke toko</Link>
      </form>
    </div>
  )
}
