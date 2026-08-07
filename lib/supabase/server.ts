import "server-only";
import { createClient } from "@supabase/supabase-js";

// 이 프로젝트 규모(70두)에 비해 supabase-js의 엄격한 Database 제네릭을 맞추는 비용이 크므로,
// 클라이언트는 비제네릭(any)으로 두고 lib/types.ts의 인터페이스를 함수 시그니처에서 사용해 타입을 보장한다.
// 비제네릭 함수 호출로 client를 만들어야 `Database = any` 기본값이 실제로 적용된다
// (제네릭 함수 타입을 직접 ReturnType으로 참조하면 기본값이 적용되지 않고 never로 좁혀진다).
function createSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY 환경 변수가 설정되어야 합니다."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

let client: ReturnType<typeof createSupabaseClient> | null = null;

export function getSupabaseServerClient() {
  if (!client) client = createSupabaseClient();
  return client;
}
