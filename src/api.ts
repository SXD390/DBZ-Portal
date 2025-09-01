import axios from 'axios'
import { API_BASE } from './config'

export type Folder = { type: 'folder'; name: string; prefix: string }
export type FileItem = { type: 'file'; key: string; name: string; size: number }
export type CatalogResponse = { prefix: string; folders: Folder[]; files: FileItem[] }

export async function fetchCatalog(prefix = ''): Promise<CatalogResponse> {
  // When API is not ready, return a mocked root so UI still renders
  if (API_BASE.includes('REPLACE_ME')) {
    return {
      prefix: '',
      folders: [
        { type: 'folder', name: 'Movies', prefix: 'Movies/' },
        { type: 'folder', name: 'Shows', prefix: 'Shows/' }
      ],
      files: []
    }
  }
  const res = await axios.get(`${API_BASE}catalog`, { params: { prefix } })
  return res.data
}

export async function fetchPlayUrl(key: string): Promise<string> {
  if (API_BASE.includes('REPLACE_ME')) {
    // Dummy placeholder video (tiny, public MP4 test clip) so UI can demo play button.
    return 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
  }
  const res = await axios.get(`${API_BASE}play`, { params: { key } })
  return res.data.url
}


