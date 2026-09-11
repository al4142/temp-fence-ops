import { LoginForm } from "@/components/LoginForm";

export const metadata = {
  title: "Sign in · Temp Fence Ops",
};

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = params.next && params.next.startsWith("/") ? params.next : "/";

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Sign in
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Internal demo login for 1–2 office users. Demo credentials are in the
          README (demo-only — change them for any real deploy).
        </p>
      </div>
      <LoginForm next={next} />
    </div>
  );
}
