import type { GetServerSideProps, NextPage } from 'next'
import { createContext, useEffect, useRef, useState } from 'react'
import { Mic, MicOff } from 'react-feather'
import Camera from '../public/components/camera'
import Button from '../public/components/un-ui/button'
import Input from '../public/components/un-ui/input'
import Form from '../public/components/un-ui/form'

import { HangClient, HangClientParent, useHangClient } from '../public/src/hang_client'
import styles from '../styles/Home.module.css'
import DropDown from '../public/components/un-ui/dropdown'
import InputModule from '../public/components/input_module'
import { useRouter } from 'next/dist/client/router'
import { randomUUID } from 'crypto'
import { Query, RTQueryHandler, subscriptions } from '@public/src/rtq'

//@ts-expect-error
export const HangClientContext = createContext<HangClient>(null);

export const getServerSideProps: GetServerSideProps = async () => {
	return {
		props: {
			id: randomUUID()
		}
	}
}

const Home: NextPage<{ id: string, hang_client: HangClientParent<null> }> = ({ id, hang_client }) => {
	const { client, hangUp, muteClient, unMuteClient, setAudioDevice, setVideoDevice, setSpeakerDevice } = hang_client;
	const [ displayName, setDisplayName ] = useState("");
	const [ date, setDate ] = useState(new Date());

	const router = useRouter();

	useEffect(() => {
		console.log("Client update propogated", client);
	}, [client]);

	const [ verified, setVerified ] = useState<[number, number, number]>([0,0,0]);
	
  	return (
		<HangClientContext.Provider value={client}>
			<div className="flex min-h-screen w-full bg-[#101418] font-sans">
				<div className="flex flex-row justify-around flex-1 items-center">
					<div className="flex flex-col items-start justify-center gap-8 transition-all duration-150">
						<a className="flex flex-row items-center text-white gap-1 text-opacity-30">powered by <h1 className="text-white">hangwith</h1></a>
						
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
								onClick={() => router.push(`./room/${id}`)} 
								icon={false}
								className="flex flex-row w-full bg-blue-700 justify-center rounded-lg px-4 py-2 text-white text-opacity-80 text-[.9rem] font-light outline-none shadow-md shadow-transparent focus:shadow-[0_0px_0px_3px_rgba(95,150,255,0.2)]"
								>
									Create Room
								</Button>
						</Form>

						{
							verified.reduce((a, b) => a*10 + b) == 111 ?
							<></>
							:
								client.localStream 
								?
								<p className="flex flex-row items-center gap-1 text-gray-400 text-sm">
									Issues identified with {" "}
									<i className="flex flex-row items-center text-red-300 text-sm not-italic">
									{
										verified.map((e, i) => {
											if(e != 1) {
												switch(i) {
													case 0:
														return "Microphone"
													case 1:	
														return "Speakers"
													case 2:
														return "Camera"
													default:
														return null
												}
											}
										})
											.filter(e => e)
											.join(",")
											.replace(/, ([^,]*)$/, ' and $1')
											.replace(/and ([^and]*)$/, '')
									}
									</i>
								</p>
								:
								<></>
						}

						<p className="flex flex-row items-center gap-2 text-gray-600 text-sm">Want to make a room instead? <a onClick={() => router.push(`./room/${router.query.roomId}`)} className="flex flex-row text-blue-400">Create Room</a></p>
					</div>

					<div className="flex flex-col items-center justify-center bg-[#181b20] h-fit p-4 rounded-lg gap-4">
						<div className="overflow-hidden rounded-xl">
							<Camera 
								_stream={client.localStream} 
								muted={true} 
								height={250}
								width={444.44}
								depth={0}
								show_audio_bar={false}
								show_resolution={true}
								></Camera>
						</div>
						
						<InputModule _stream={client.localStream} depth={0} client={client} muted={true} audioCallback={setAudioDevice} type="audio.in" defaultDevice={client?.currentAudio?.getCapabilities().groupId ?? ""} verificationCallback={setVerified} v={verified} hang_client={hang_client} />
						<InputModule _stream={client.localStream} depth={0} client={client} muted={true} speakerCallback={setSpeakerDevice} type="audio.out" defaultDevice={client?.sinkDevice?.groupId ?? ""} verificationCallback={setVerified} v={verified} hang_client={hang_client} />
						<InputModule _stream={client.localStream} depth={0} client={client} muted={true} videoCallback={setVideoDevice} type="video.in" defaultDevice={client?.currentVideo?.getCapabilities().groupId ?? ""} verificationCallback={setVerified} v={verified} hang_client={hang_client} />
					</div>	
				</div>
			</div>
		</HangClientContext.Provider>
	)
}

export default Home
