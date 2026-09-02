import iconv from 'iconv-lite'

/** Windows 管道壳：把回车统一成 \r\n，避免空命令。 */
export function toWindowsNewlines(text) {
  const source = String(text)
  let out = ''
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]
    if (char === '\r' && source[i + 1] === '\n') {
      out += '\r\n'
      i += 1
    } else if (char === '\r' || char === '\n') {
      out += '\r\n'
    } else {
      out += char
    }
  }
  return out
}

export function encodingOf(spec) {
  return spec?.encoding || 'utf8'
}

/** 按壳的编码一块块解开，半截汉字不会拆坏。 */
export function createDecoder(encoding) {
  const decoder = iconv.getDecoder(encoding)
  return (chunk) => {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    return decoder.write(buf) || ''
  }
}

export function encodeInput(text, encoding, platform = process.platform) {
  const body = platform === 'win32' ? toWindowsNewlines(text) : String(text)
  if (encoding === 'utf8' || encoding === 'utf-8') return body
  return iconv.encode(body, encoding)
}
