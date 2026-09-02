const HEX_LIMIT = 256 * 1024

export function formatSize(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} 字节`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function base64ToBytes(b64) {
  const bin = atob(String(b64 ?? ''))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function toPngBlob(bytes, mime) {
  const input = new Blob([bytes], { type: mime || 'image/png' })
  if (input.type === 'image/png') return input
  if (typeof createImageBitmap !== 'function') return input
  try {
    const bitmap = await createImageBitmap(input)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0)
    const png = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/png')
    })
    return png ?? input
  } catch {
    return input
  }
}

export async function copyImageBytes(bytes, mime) {
  if (!bytes || bytes.byteLength === 0) return false
  const blob = await toPngBlob(bytes, mime)
  try {
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
    return true
  } catch {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      return true
    } catch {
      return false
    }
  }
}

export function formatHexDump(buffer, limit = HEX_LIMIT) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer ?? [])
  const view = bytes.length > limit ? bytes.subarray(0, limit) : bytes
  const lines = []
  for (let offset = 0; offset < view.length; offset += 16) {
    const row = view.subarray(offset, Math.min(offset + 16, view.length))
    let hex = ''
    let ascii = ''
    for (let i = 0; i < 16; i++) {
      if (i === 8) hex += ' '
      if (i < row.length) {
        hex += row[i].toString(16).padStart(2, '0') + ' '
        const code = row[i]
        ascii += code >= 32 && code <= 126 ? String.fromCharCode(code) : '.'
      } else {
        hex += '   '
      }
    }
    lines.push(`${offset.toString(16).padStart(8, '0')}  ${hex} ${ascii}`)
  }
  if (bytes.length > limit) {
    lines.push('')
    lines.push(`… 后面还有 ${bytes.length - limit} 字节未展开`)
  }
  return lines.join('\n')
}
