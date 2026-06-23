const BASE_URL = '/api'

function getToken() {
  return localStorage.getItem('token') || ''
}

export async function request(url, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  }

  const res = await fetch(BASE_URL + url, {
    method: options.method || 'GET',
    headers,
    body: options.data ? JSON.stringify(options.data) : undefined
  })

  const result = await res.json()

  if (result.code === 0) {
    return result.data
  } else if (result.code === 401) {
    localStorage.removeItem('token')
    throw new Error(result.message || '未登录')
  } else {
    throw new Error(result.message || '请求失败')
  }
}

export function get(url, params = {}) {
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')
  return request(query ? `${url}?${query}` : url)
}

export function post(url, data = {}) {
  return request(url, { method: 'POST', data })
}

export function del(url, data = {}) {
  return request(url, { method: 'DELETE', data })
}
