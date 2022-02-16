import type { NextPage } from 'next'
import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff } from 'react-feather'
import Camera from '@components/camera'
import Button from '@components/un-ui/button'
import Input from '@components/un-ui/input'
import Form from '@components/un-ui/form'
import { supabase } from '@public/src/client'

import { useHangClient } from '@public/src/hang_client'
import styles from '@styles/Home.module.css'
import DropDown from '@public/components/un-ui/dropdown'
import InputModule from '@public/components/input_module'
import { useRouter } from 'next/dist/client/router'

const Home: NextPage = () => {
	const { client, createRoom, joinRoom, hangUp, muteClient, unMuteClient, setAudioDevice } = useHangClient(supabase);
	const [ displayName, setDisplayName ] = useState("");

	const router = useRouter();
	if(router?.query?.roomId) joinRoom(router.query.roomId)
	
  	return (
		<div className="flex min-h-screen w-full bg-[#101418] font-sans">
			<div>
				<p>{client?.room_id}</p>

				<div className={styles.communication}>
					<div>
						<h2>YOU</h2>
						<Camera camera_stream={client.localStream} muted={true}></Camera>
					</div>

					<div>
						<h2>USER</h2>
						<Camera camera_stream={client.remoteStream} muted={false}></Camera>
					</div>
				</div>

				<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
					{
						client.muted ? 
							<Button onClick={() => unMuteClient()} icon={<MicOff size={16} />}></Button>
						:
							<Button onClick={() => muteClient()} icon={<Mic size={16} />}></Button>
					}

					<DropDown 
						options={client.devices.filter(e => e.kind == "audioinput" && e.deviceId !== "default" && e.deviceId !== "communications")} 
						defaultValue={client.currentAudio?.getCapabilities().groupId} 
						parameter={"label"} 
						valueParameter={"groupId"}
						callback={(e: any) => { {
							const source = client.devices.find(__ => __.groupId == e && __.kind == "audioinput");
							if(source) setAudioDevice(source)
						}}}
						/>
				</div>

				<Button onClick={() => hangUp()}>Leave Room</Button>
			</div>
		</div>
	)
}

export default Home