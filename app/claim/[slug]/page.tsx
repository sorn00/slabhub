import { permanentRedirect } from 'next/navigation'

export default function ClaimRedirectPage({ params }: { params: { slug: string } }) {
  permanentRedirect(`/directory/${params.slug}/claim`)
}
