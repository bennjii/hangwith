import type { NextPage } from 'next'
import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Phone, PhoneOff } from 'react-feather'
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
import Image from 'next/image'

const Home: NextPage = () => {
	const { client, createRoom, joinRoom, hangUp, muteClient, unMuteClient, setAudioDevice } = useHangClient(supabase);
	const [ displayName, setDisplayName ] = useState("");
	const router = useRouter();

	useEffect(() => {
		const rid = router?.query?.roomId;
		
		if(rid && typeof rid == "string") {
			supabase.from('rooms')
				.select("*")
				.match({ room_id: rid })
				.then(e => {
					if(e.body) {
						joinRoom(router.query.roomId);
					}else {
						createRoom(rid)
					}
				})
		}
	}, []);
	
  	return (
		<div className="flex min-h-screen w-full bg-[#101418] font-sans p-24 flex-col">
			<h1 className="text-white">hangwith</h1>

			<div className="flex flex-col gap-4 flex-1">
				<div className="flex flex-row justify-evenly items-center p-20 w-full gap-4 flex-1">
					<div className="w-1/2 bg-[#181b20] min-h-full h-full rounded-lg overflow-hidden">
						<Camera 
							_stream={client.localStream} 
							muted={true}
							show_audio_bar={true}
							></Camera>
					</div>

					<div className="w-1/2 bg-[#181b20] min-h-full h-full rounded-lg overflow-hidden">
						{
							(client.remoteStream?.getAudioTracks().length > 0) ?
								<Camera 
									_stream={client.remoteStream} 
									muted={false}
									show_audio_bar={false}
									></Camera>
							:
							<div className="flex flex-1 h-full justify-center items-center">
								+
							</div>
						}
						
					</div>
				</div>

				{/* <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
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
				</div> */}
				
				<div className="flex flex-row items-center gap-4 justify-center">
					{
						client.muted ? 
							<Button 
								onClick={() => unMuteClient()} 
								icon={false}
								className="flex justify-center items-center bg-gray-500 p-4 rounded-full"
								>
                                    <Image src={"/icons/muted.svg"} alt="Microphone Off" height={15} width={15} className="z-50"/>
								</Button>
						:
							<Button 
								onClick={() => muteClient()} 
								icon={false}
								className="flex justify-center items-center bg-gray-500 p-4 rounded-full"
								>
                                    <Image src={"/icons/mic.svg"} alt="Microphone On" height={15} width={15} className="z-50"/>
								</Button>
					}

					<Button 
						onClick={() => hangUp().then(e => router.push('../../'))} 
						icon={false}
						className="flex justify-center items-center bg-red-500 p-4 rounded-full shadow-[0_0px_0px_3px_rgba(239, 68, 68,0.4)]"
						> 
						<Image src={"/icons/hangup.svg"} alt="Microphone On" height={20} width={20} className="z-50"/>	
					</Button>
				</div>
			</div>
		</div>
	)
}

export default Home