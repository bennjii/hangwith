import type { NextPage } from 'next'
import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Phone, PhoneOff } from 'react-feather'
import Camera from '@components/camera'
import Button from '@components/un-ui/button'
import Input from '@components/un-ui/input'
import Form from '@components/un-ui/form'

import { HangClientParent, useHangClient } from '@public/src/hang_client'
import styles from '@styles/Home.module.css'
import DropDown from '@public/components/un-ui/dropdown'
import InputModule from '@public/components/input_module'
import { useRouter } from 'next/dist/client/router'
import Image from 'next/image'
import { Query } from '@public/src/rtq'

const Home: NextPage<{ id: string, hang_client: HangClientParent<{ a: any}> }> = ({ id, hang_client }) => {
	const { ws, client, joinRoom, createRoom, hangUp, muteClient, unMuteClient, setAudioDevice, setVideoDevice, setSpeakerDevice } = hang_client;

	const [ displayName, setDisplayName ] = useState("");
	const router = useRouter();

	useEffect(() => {
		if(client.localStream && !client.connected) {
			const rid = router?.query?.roomId;

			console.log("Beginning Primary Initiation Phase ", rid);
		
			if(rid && typeof rid == "string") {
				new Query(ws).in(rid).get("all")
				.then(e => {
					console.log(e);

					const data = e.response.message !== "404" && e.response.message !== "406"; 

					if(data) {
						console.log("Joining Room")
						joinRoom(rid);
					}else {
						console.log("Creating Room!")
						createRoom(rid);
					}
				})
			}
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [client, router.query.roomId]);
	
  	return (
		<div className="flex min-h-screen w-full bg-[#101418] font-sans p-24 flex-col">
			<h1 className="text-white">hangwith</h1>

			<div className="flex flex-col gap-4 flex-1">
				<div className="flex flex-row justify-evenly items-center p-20 w-full gap-4 flex-1">
					<div className="w-1/2 bg-[#181b20] min-h-full h-full rounded-lg overflow-hidden">
						<Camera 
							_stream={client.localStream} 
							muted={true}
							depth={1}
							show_audio_bar={true}
							show_resolution={true}
							></Camera>
					</div>

					<div className="w-1/2 bg-[#181b20] min-h-full h-full rounded-lg overflow-hidden">
						<Camera 
							_stream={client.remoteStream} 
							muted={false}
							depth={1}
							show_audio_bar={true}
							show_resolution={true}
						></Camera>
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
						onClick={() => hangUp().then(() => router.push('../../'))} 
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