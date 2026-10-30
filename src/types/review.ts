// Testimonials: screenshots of real customer WhatsApp chats, uploaded by the admin for a product.
// (No star ratings: the website is a catalog without order tracking, so purchases can't be verified automatically.)
export interface Testimonial {
  id: string
  productId: string
  /** the picture itself, shrunk to WebP and stored as a data: URL (keeps us on the free plan) */
  image: string
  caption?: string
  /** ISO date, e.g. "2026-10-15" */
  date: string
}
