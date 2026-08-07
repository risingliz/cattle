import { login } from "./actions";
import { Card } from "@/components/ui/Card";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui/classes";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto mt-24 w-full max-w-sm">
      <Card title="한우 비육 관리 로그인">
        <form action={login} className="flex flex-col gap-4">
          <input type="hidden" name="redirect" value={params.redirect ?? "/"} />
          <div>
            <label className={labelClass}>비밀번호</label>
            <input
              type="password"
              name="password"
              required
              autoFocus
              className={inputClass}
            />
          </div>
          <button type="submit" className={primaryButtonClass}>
            로그인
          </button>
        </form>
      </Card>
    </div>
  );
}
