import { RecoverCheckoutClient } from "./recover-client"

export default async function RecoverCheckoutPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <RecoverCheckoutClient token={token} />
}
