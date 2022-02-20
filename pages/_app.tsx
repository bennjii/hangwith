import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { createContext } from 'react'
import useHangClient, { default_config, HangClient, HangClientParent, HangClientProps } from '@public/src/hang_client'
import { supabase } from '@public/src/client';

function HangWith({ Component, pageProps }: AppProps) {
	const hang_client: HangClientParent<HangClientProps> = useHangClient(supabase);

	const props = {
		hang_client,
		...pageProps
	}

  	return (
		<Component {...props} />
  	)
}
export default HangWith
