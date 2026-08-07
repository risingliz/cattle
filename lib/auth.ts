// Edge 미들웨어와 서버 액션 양쪽에서 사용되므로 Web Crypto API(crypto.subtle)만 사용한다.
export const AUTH_COOKIE_NAME = "farm_auth";

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
