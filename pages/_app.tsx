import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { createContext } from 'react'
import { default_config, HangClient } from '@public/src/hang_client'

function HangWith({ Component, pageProps }: AppProps) {
  	return (
		<Component {...pageProps} />
  	)
}
export default HangWith
