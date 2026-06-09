/**
 * 使用浏览器原生 Web Crypto API 对密码进行 SHA-256 哈希
 * 零依赖，避免 F12 Network 面板暴露明文密码
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
