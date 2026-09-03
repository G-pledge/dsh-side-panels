/** 嵌页失败页：有回包就显示回包，空页才按真实错误码补上。 */

export const NET_ERROR_NAMES = {
  [-105]: 'ERR_NAME_NOT_RESOLVED',
  [-106]: 'ERR_INTERNET_DISCONNECTED',
  [-102]: 'ERR_CONNECTION_REFUSED',
  [-101]: 'ERR_CONNECTION_RESET',
  [-100]: 'ERR_CONNECTION_CLOSED',
  [-104]: 'ERR_CONNECTION_FAILED',
  [-118]: 'ERR_CONNECTION_TIMED_OUT',
  [-130]: 'ERR_PROXY_CONNECTION_FAILED',
  [-111]: 'ERR_TUNNEL_CONNECTION_FAILED',
  [-127]: 'ERR_SOCKS_CONNECTION_FAILED',
  [-324]: 'ERR_EMPTY_RESPONSE',
  [-107]: 'ERR_SSL_PROTOCOL_ERROR',
  [-109]: 'ERR_ADDRESS_UNREACHABLE',
  [-21]: 'ERR_NETWORK_CHANGED',
  [-27]: 'ERR_BLOCKED_BY_CLIENT',
  [-201]: 'ERR_CERT_COMMON_NAME_INVALID',
  [-202]: 'ERR_CERT_AUTHORITY_INVALID',
  [-200]: 'ERR_CERT_CONTAINS_ERRORS',
}

export function errorPageHost(url) {
  try {
    const host = new URL(url).hostname
    return host || String(url || '')
  } catch {
    return String(url || '')
  }
}

export function netErrorCodeName(code, description) {
  const mapped = NET_ERROR_NAMES[Number(code)]
  if (mapped) return mapped
  const raw = String(description || '').trim()
  const named = raw.match(/ERR_[A-Z0-9_]+/)
  if (named) return named[0]
  if (Number(code)) return `ERR_${Math.abs(Number(code))}`
  return ''
}

export function describeNetError(code, url, description) {
  const host = errorPageHost(url)
  const name = netErrorCodeName(code, description)
  if (name === 'ERR_PROXY_CONNECTION_FAILED' || name === 'ERR_SOCKS_CONNECTION_FAILED') {
    return { title: '无法访问此网站', detail: '代理服务器出现问题，或者地址有误。', name }
  }
  if (name === 'ERR_TUNNEL_CONNECTION_FAILED') {
    return { title: '无法访问此网站', detail: host ? `${host} 的安全连接建立失败。` : '安全连接建立失败。', name }
  }
  if (name === 'ERR_EMPTY_RESPONSE') {
    return { title: '没有数据', detail: host ? `${host} 没有发送任何数据。` : '网站没有发送任何数据。', name }
  }
  if (name === 'ERR_NAME_NOT_RESOLVED') {
    return { title: '找不到该网站', detail: host ? `找不到 ${host} 的 IP 地址。` : '找不到该网站的 IP 地址。', name }
  }
  if (name === 'ERR_INTERNET_DISCONNECTED') {
    return { title: '没有网络连接', detail: '请检查网线、无线网络或代理设置。', name }
  }
  if (name === 'ERR_CONNECTION_TIMED_OUT') {
    return { title: '无法访问此网站', detail: host ? `${host} 响应时间过长。` : '响应时间过长。', name }
  }
  if (name === 'ERR_CONNECTION_REFUSED') {
    return { title: '无法访问此网站', detail: host ? `${host} 拒绝了连接。` : '网站拒绝了连接。', name }
  }
  if (name === 'ERR_CONNECTION_RESET') {
    return { title: '无法访问此网站', detail: host ? `${host} 意外中断了连接。` : '连接被中断。', name }
  }
  if (name === 'ERR_SSL_PROTOCOL_ERROR' || String(name).startsWith('ERR_CERT_')) {
    return { title: '连接不是专用连接', detail: host ? `攻击者可能试图窃取 ${host} 的信息。` : '证书或加密出现问题。', name }
  }
  return {
    title: '无法访问此网站',
    detail: host ? `${host} 意外中断了连接。` : '网页无法加载。',
    name: name || 'ERR_FAILED',
  }
}

export function describeHttpError(status, url) {
  const code = Number(status) || 0
  const host = errorPageHost(url)
  return {
    title: '该网页无法正常运作',
    detail: host ? `${host} 目前无法处理此请求。` : '目前无法处理此请求。',
    name: `HTTP ERROR ${code}`,
  }
}

export function looksBlankPage(info) {
  if (!info || typeof info !== 'object') return false
  const text = String(info.text || '').trim()
  if (text) return false
  if (Number(info.media) > 0) return false
  const htmlLen = Number(info.htmlLen) || 0
  return htmlLen < 240
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildErrorPageHtml({ title, detail, name, reloadUrl }) {
  const safeTitle = escapeHtml(title)
  const safeDetail = escapeHtml(detail)
  const safeName = escapeHtml(name)
  const href = String(reloadUrl || '').trim()
  const reload = href.startsWith('http://') || href.startsWith('https://')
    ? `location.replace(${JSON.stringify(href)})`
    : 'location.reload()'
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
<style>
  html,body{margin:0;padding:0;background:#fff;color:#333;font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif}
  main{max-width:540px;margin:0 auto;padding:14vh 24px 40px}
  svg{width:48px;height:48px;display:block}
  h1{font-size:22px;font-weight:400;margin:18px 0 10px;line-height:1.3}
  p{margin:0 0 18px;font-size:14px;color:#5f6368;line-height:1.6}
  code{display:block;font-size:12px;color:#9aa0a6;margin-bottom:28px}
  button{
    background:#1a73e8;
    color:#fff;
    border:none;
    border-radius:4px;
    padding:8px 22px;
    font-size:13px;
    cursor:pointer;
    box-shadow:0 1px 2px rgb(0 0 0 / 22%);
    transition:background .08s ease,box-shadow .08s ease,transform .08s ease;
  }
  button:hover{background:#1557b0;box-shadow:0 1px 3px rgb(0 0 0 / 28%)}
  button:active{
    background:#12499a;
    transform:translateY(1px) scale(.98);
    box-shadow:none;
  }
  button:focus-visible{outline:2px solid #1a73e8;outline-offset:2px}
</style>
</head>
<body>
<main>
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#9aa0a6" d="M10 6h18l10 10v26H10z"/>
    <path fill="#fff" d="M28 6v10h10"/>
    <circle cx="18.5" cy="28" r="1.6" fill="#5f6368"/>
    <circle cx="29.5" cy="28" r="1.6" fill="#5f6368"/>
    <path fill="none" stroke="#5f6368" stroke-width="1.6" stroke-linecap="round" d="M19 34c2 2.2 8 2.2 10 0"/>
  </svg>
  <h1>${safeTitle}</h1>
  <p>${safeDetail}</p>
  <code>${safeName}</code>
  <button type="button" onclick="${reload}">重新加载</button>
</main>
</body>
</html>`
}

export function inspectBlankScript() {
  return `(function(){
    if (window.__dshErrorFilled) return { text: 'filled', htmlLen: 999, media: 1, status: 0, href: location.href, title: document.title || '' }
    const body = document.body
    const text = (body && body.innerText || '').replace(/\\s+/g, ' ').trim()
    const htmlLen = body ? body.innerHTML.length : 0
    const media = body ? body.querySelectorAll('img,canvas,svg,video,iframe').length : 0
    let status = 0
    try {
      const nav = performance.getEntriesByType('navigation')[0]
      if (nav && nav.responseStatus) status = nav.responseStatus
    } catch (e) {}
    return { text: text.slice(0, 400), htmlLen, media, status, href: location.href, title: document.title || '' }
  })()`
}

export function writeErrorPageScript(html) {
  return `(function(){
    if (window.__dshErrorFilled) return 'done'
    document.open()
    document.write(${JSON.stringify(html)})
    document.close()
    window.__dshErrorFilled = true
    return 'filled'
  })()`
}
