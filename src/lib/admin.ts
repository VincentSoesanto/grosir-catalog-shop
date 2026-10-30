// Accounts allowed to use the admin page: comma-separated Firebase Auth UIDs in VITE_ADMIN_UIDS.
// Must match the list in firestore.rules (the rules are what really protect the data; this list only decides
// what the page shows).
export const ADMIN_UIDS = (import.meta.env.VITE_ADMIN_UIDS ?? '')
  .split(',')
  .map((uid: string) => uid.trim())
  .filter(Boolean)

export const isAdminUid = (uid: string | undefined | null) => !!uid && ADMIN_UIDS.includes(uid)
