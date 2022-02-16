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

	const router = useRouter()
	
  	return (
		<div className="flex min-h-screen w-full bg-[#101418] font-sans">
			{
				client?.room_id ? 
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
				:
				<div className="flex flex-row justify-around flex-1 items-center">
					<div className="flex flex-col items-start justify-center gap-4">
						<div className="flex flex-col gap-2">
							<p className="text-[#62676c] m-0">Choose a name to create a hangroom.</p>
							<h1 className="text-white text-xl m-0">Let{"\'"}s check your camera and mic</h1>
						</div>
						
						<Form className="flex flex-col items-center gap-4">
							<Input 
								type="text"
								placeholder="Display Name" 
								callback={(value: any) => setDisplayName(value)}
								className="rounded-lg bg-[#282d34] transition-all w-full px-4 py-2 min-w-[320px] border-2 border-transparent focus:border-blue-700 text-[.9rem] text-white font-sans outline-none focus:shadow-[0_0px_0px_3px_rgba(95,150,255,0.2)]" 
								/>

							<Button 
								onClick={() => joinRoom(router.query.roomId) } 
								icon={false}
								className="flex flex-row w-full bg-blue-700 justify-center rounded-lg px-4 py-2 text-white text-opacity-80 text-[.9rem] font-light outline-none shadow-md shadow-transparent hover:shadow-[0_3px_10px_rgba(58, 151, 212, 1)]"
								>
									Join Room
								</Button>
						</Form>

						<p className="flex flex-row items-center gap-2 text-gray-600 text-sm">Want to make a room instead? <a onClick={() => createRoom()} className="flex flex-row text-blue-400">Create Room</a></p>
					</div>

					<div className="flex flex-col items-center justify-center bg-[#181b20] h-fit p-4 rounded-lg gap-4">
						<div className="overflow-hidden rounded-xl">
							<Camera 
								camera_stream={client.localStream} 
								muted={true} 
								height={250}
								audioBar={false}
								></Camera>
						</div>
						
						<InputModule _stream={client.localStream} client={client} muted={true} audioCallback={setAudioDevice} type="audio.in" />
						<InputModule _stream={client.localStream} client={client} muted={true} speakerCallback={setAudioDevice} type="audio.out" />
						<InputModule _stream={client.localStream} client={client} muted={true} videoCallback={setAudioDevice} type="video.in" />
					</div>	
				</div>
			}
		</div>
	)
}

export default Home