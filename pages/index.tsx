import type { NextPage } from 'next'
import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff } from 'react-feather'
import Camera from '../public/components/camera'
import Button from '../public/components/un-ui/button'
import Input from '../public/components/un-ui/input'
import Form from '../public/components/un-ui/form'
import { supabase } from '../public/src/client'

import { useHangClient } from '../public/src/hang_client'
import styles from '../styles/Home.module.css'
import DropDown from '../public/components/un-ui/dropdown'

const Home: NextPage = () => {
	const { client, createRoom, joinRoom, hangUp, muteClient, unMuteClient, setAudioDevice } = useHangClient(supabase);
	const [ discoverID, setDiscoverID ] = useState("");
	
  	return (
		<div className={styles.container}>
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
				</div>
				:
				<></>
			}

			{
				client?.room_id ? 
				<Button onClick={() => hangUp()}>Leave Room</Button>
				:
				<div className="flex flex-row justify-between">
					<div className="flex flex-col items-center justify-center gap-4">
						<p>No room, try joining one.</p>

						<Form style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
							<Input 
								type="text" 
								placeholder="Room ID" 
								callback={(value: any) => setDiscoverID(value)}
								/>

							<Button onClick={() => joinRoom(discoverID) }>Join Room</Button>
						</Form>
						
						<p>or</p>

						<Button onClick={() => createRoom()}>Create Room</Button>

					</div>

					<div className="flex flex-col items-center justify-center">
						<Camera camera_stream={client.localStream} muted={true} height={250}></Camera>
					</div>	
				</div>
				
			}
		</div>
	)
}

export default Home
