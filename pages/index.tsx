import type { NextPage } from 'next'
import { useEffect, useRef, useState } from 'react'
import Camera from '../public/components/camera'
import { supabase } from '../public/src/client'

import { useHangClient } from '../public/src/hang_client'
import styles from '../styles/Home.module.css'

const Home: NextPage = () => {
	// const local_ref = useRef(null);
	// const target_ref = useRef(null);

	const { client, createRoom, joinRoom, hangUp } = useHangClient(supabase);
	const input_ref = useRef(null);

    // useEffect(() => {
	// 	//@ts-expect-error
	// 	if(local_ref.current) local_ref.current.srcObject = client.localStream;
    // }, [client.localStream, client?.room_id])

    // useEffect(() => {
	// 	//@ts-expect-error
    //     if(target_ref.current) target_ref.current.srcObject = client.remoteStream;
    // }, [client.remoteStream, client?.room_id])
	
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
				</div>
				:
				<p>No room, try joining one.</p>
			}

			{
				client?.room_id ? 
				<button onClick={() => hangUp()}>Leave Room</button>
				:
				<div>
					<button onClick={() => createRoom()}>Create Room</button>
					<input type="text" placeholder="room id" ref={input_ref}/>

					<button 
						//@ts-expect-error
						onClick={() => joinRoom(input_ref.current?.value)}>
						Join Room
					</button>
				</div>	
			}
		</div>
	)
}

export default Home
