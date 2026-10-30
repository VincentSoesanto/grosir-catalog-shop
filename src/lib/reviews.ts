// Testimonial screenshots for a product, stored in Firestore (testimonials/<auto id>) by the admin page.
import { collection, getDocs, query, where } from 'firebase/firestore/lite'
import type { Testimonial } from '../types/review'
import { db, firebaseConfigured } from './firebase'

export async function loadTestimonials(productId: string): Promise<Testimonial[]> {
  if (!firebaseConfigured) return []
  try {
    const snap = await getDocs(query(collection(db, 'testimonials'), where('productId', '==', productId)))
    return snap.docs
      .map((d) => ({ ...(d.data() as Omit<Testimonial, 'id'>), id: d.id }))
      .sort((a, b) => b.date.localeCompare(a.date)) // newest first
  } catch {
    return [] // testimonials are extra: never break the product page because of them
  }
}
