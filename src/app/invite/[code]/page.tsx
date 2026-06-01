import { redirect } from "next/navigation";

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  redirect(`/sign-up?invite=${code}`);
}
