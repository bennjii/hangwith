import '../styles/globals.css'
import type { AppProps } from 'next/app'

function HangWith({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}
export default HangWith
