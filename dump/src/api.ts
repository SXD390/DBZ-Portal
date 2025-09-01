import axios from 'axios'
import { API_BASE } from './config'

export type Folder = { type: 'folder'; name: string; prefix: string }
export type FileItem = { type: 'file'; key: string; name: string; size: number }
export type CatalogResponse = { prefix: string; folders: Folder[]; files: FileItem[] }

function unwrapApiGateway<T>(data: unknown): T {
  if (data && typeof data === 'object' && 'body' in (data as any)) {
    const body = (data as any).body
    if (typeof body === 'string') {
      try {
        return JSON.parse(body) as T
      } catch {
        // If parsing fails, return as-is
        return body as unknown as T
      }
    }
    return body as T
  }
  return data as T
}

export async function fetchCatalog(prefix = ''): Promise<CatalogResponse> {
  const res = await axios.get(`${API_BASE}catalog`, { params: { prefix } })
  return unwrapApiGateway<CatalogResponse>(res.data)
}

export async function fetchPlayUrl(key: string): Promise<string> {
  const res = await axios.get(`${API_BASE}play`, { params: { key } })
  const data = unwrapApiGateway<{ url?: string } | { playUrl?: string } | { signedUrl?: string } | string>(res.data)
  if (typeof data === 'string') return data
  const url = (data as any).url || (data as any).playUrl || (data as any).signedUrl
  if (!url) throw new Error('No URL in play response')
  return url
}


