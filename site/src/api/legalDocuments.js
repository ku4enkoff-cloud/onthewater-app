import { API_BASE } from '../config'

export async function fetchLegalDocument(slug) {
  const base = API_BASE || ''
  const res = await fetch(`${base}/legal-documents/${encodeURIComponent(slug)}`, {
    credentials: 'omit',
  })
  if (!res.ok) {
    const err = new Error(`legal-document ${res.status}`)
    try {
      const data = await res.json()
      err.message = data?.error || err.message
    } catch (_) {}
    throw err
  }
  return res.json()
}
