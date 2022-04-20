import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { createContext, useEffect, useState } from 'react'
import useHangClient, { default_config, HangClient, HangClientParent, HangClientProps } from '@public/src/hang_client'
import { Query, RTQueryHandler, subscriptions } from '@public/src/rtq';
import { env } from 'process';

export const isBrowser = typeof window !== "undefined";

function HangWith({ Component, pageProps }: AppProps) {
	const [ws] = useState(() => isBrowser ? new RTQueryHandler() : null);

	useEffect(() => {
        ws?.init()?.then(e => {
			window.onclose = () => {
				subscriptions.map(e => new Query(ws as RTQueryHandler).in(e.location).unsubscribe("all", () => {}))
			}
		})

	// eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

	const hang_client: HangClientParent<HangClientProps> = useHangClient(ws as RTQueryHandler);

	const props = {
		hang_client,
		...pageProps
	}

  	return (
		<Component {...props} />
  	)
}
export default HangWith
