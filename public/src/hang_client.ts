import { supabase } from "./client";
import { v4 as uuidv4 } from 'uuid';
import { useEffect, useState } from "react";

export const useHangClient = (configuration: any) => {
    const [ client, setClient ] = useState<{
        config: any,
        localStream: MediaStream,
        remoteStream: MediaStream,
        peerConnection: RTCPeerConnection,
        room_id: any,
        connected: boolean
    }>({
        config: configuration,
        //@ts-expect-error
        localStream: null,
        //@ts-expect-error
        remoteStream: process.browser ? new MediaStream() : null,
        //@ts-expect-error
        peerConnection: process.browser ? new RTCPeerConnection(configuration) : null,
        room_id: null,
        connected: false,
    });

    useEffect(() => {
        if(process.browser && !client.localStream) {
            if(navigator.mediaDevices) {
                navigator.mediaDevices?.getUserMedia({
                    video: true,
                    audio: true
                }).then((stream: MediaStream) => {
                    // client.localStream = stream;
                    setClient({ ...client, localStream: stream });
                });
            }else {
                // client.localStream = new MediaStream();
                setClient({ ...client, localStream: new MediaStream() });
            }
        }   
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const createRoom = async () => {  
        setClient({ ...client, connected: true, peerConnection: new RTCPeerConnection(client.config)});

        registerPeerConnectionListeners();

        client.localStream?.getTracks().forEach(track => {
            client.peerConnection.addTrack(track, client.localStream);
        });

        // Create a room
        const offer = await client.peerConnection.createOffer();
        await client.peerConnection.setLocalDescription(offer);

        // Create a new supabase room with 'roomWithOffer' value. Store the generated return room's id.
        const roomId = 
            await supabase
                .from('rooms')
                .insert({
                    room_id: uuidv4(),
                    offer: {
                        type: offer.type,
                        sdp: offer.sdp
                    },
                    // caller_candidates
                })
                .then(e => { 
                    return e.data?.[0].room_id;
                });
                
        // client.room_id = roomId;
        setClient({ ...client, room_id: roomId });

        // Collect ICE candidates
        client.peerConnection.addEventListener('icecandidate', event => {
            console.log(event);
            if(!event.candidate) return;  

            supabase
                .from('rooms')
                .select("*")
                .match({ room_id: roomId })
                .then(e => {
                    const data = e.data?.[0];

                    if(data) {
                        const new_callers = data.caller_candidates ? [ ...data.caller_candidates, event.candidate?.toJSON() ] : [event.candidate?.toJSON()];

                        console.log(new_callers)

                        supabase
                            .from('rooms')
                            .update({ caller_candidates: new_callers })
                            .match({ room_id: roomId })
                            .then(e => {
                                console.log(e)
                            })
                    }
                })
        });

        client.peerConnection.addEventListener('track', event => {
            console.log("Tracks Added", event);
            
            event.streams[0].getTracks().forEach(track => client.remoteStream.addTrack(track));
        });

        supabase
            .from(`rooms:room_id=eq.${roomId}`)
            .on("*", async payload => {
                const data = payload.new;

                if(payload.eventType == "DELETE") hangUp(); 

                if(!client.peerConnection.currentRemoteDescription && data && data.answer) {
                    const rtcSessionDescription = new RTCSessionDescription(data.answer);
                    await client.peerConnection.setRemoteDescription(rtcSessionDescription);
                }

                // Check if ICE candidates change, if so add new ICE candidate to peer connection
                if(payload.old?.callee_candidates?.length > 0 &&  payload.old?.callee_candidates !== data?.callee_candidates) {
                    client.peerConnection.addIceCandidate(new RTCIceCandidate(data.callee_candidates));
                }
            }).subscribe()
    }

    const joinRoom = async (room_id: any) => {  
        const data = await supabase
            .from('rooms')
            .select()
            .match({ room_id: room_id })
            .then(e => {
                return e?.data?.[0];
            });

        if(data) {
            setClient({ ...client, peerConnection: new RTCPeerConnection(client.config), connected: true, room_id: data.room_id })

            registerPeerConnectionListeners();

            client.localStream.getTracks().forEach(track => {
                client.peerConnection.addTrack(track, client.localStream);
            });

            client.peerConnection.addEventListener('track', event => {
                event.streams[0].getTracks().forEach(track => client.remoteStream.addTrack(track));
            });

            await client.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

            const answer = await client.peerConnection.createAnswer();
            await client.peerConnection.setLocalDescription(answer);

            await supabase
                .from('rooms')
                .update({ 
                    answer: {
                        type: answer.type,
                        sdp: answer.sdp,
                    },
                })
                .match({ room_id: room_id })

            client.peerConnection.addEventListener('icecandidate', event => {
                if (!event.candidate) return;

                // Maybe quite expensive task given 4 way ping.
                supabase
                    .from('rooms')
                    .select()
                    .match({ room_id: room_id })
                    .then(e => {
                        const data = e.data?.[0];

                        if(data) {
                            const new_callees = data.callee_candidates ? [ ...data.callee_candidates, event.candidate?.toJSON() ] : [event.candidate?.toJSON()]

                            supabase
                                .from('rooms')
                                .update({ callee_candidates: new_callees })
                                .match({ room_id: room_id })
                        }
                    })
                });   

            supabase
                .from(`rooms:room_id=eq.${room_id}`)
                .on("*", payload => {
                    if(payload.eventType == "DELETE") { hangUp(); return; }

                    payload.new.caller_candidates.forEach((e: RTCIceCandidateInit) => {
                        client.peerConnection.addIceCandidate(new RTCIceCandidate(e))
                    })
                }).subscribe()
        }
    }

    const hangUp = async () => {    
        if(client.remoteStream) client.remoteStream.getTracks().forEach(track => track.stop());
        if (client.peerConnection) client.peerConnection.close();

        setClient({ ...client, connected: false, room_id: null });
        supabase.getSubscriptions().forEach(e => e.unsubscribe());
        
        if(client.room_id) {
            const data = await supabase
                .from('rooms')
                .select()
                .match({ room_id: client.room_id })
                .then(e => e?.data?.[0]);
            
            console.log(data);

            data.callee_candidates.forEach(async (candidate: any) => {
                await candidate.ref.delete();
            });

            data.caller_candidates.forEach(async (candidate: any) => {
                await candidate.ref.delete();
            });

            await supabase
                .from('rooms')
                .delete()
                .match({ room_id: client.room_id });
        }
    }

    const registerPeerConnectionListeners = () => {
        client.peerConnection.addEventListener('icegatheringstatechange', () => {
          console.log(`ICE gathering state changed: ${client.peerConnection.iceGatheringState}`);
        });
      
        client.peerConnection.addEventListener('connectionstatechange', () => {
          console.log(`Connection state change: ${client.peerConnection.connectionState}`);
        });
      
        client.peerConnection.addEventListener('signalingstatechange', () => {
          console.log(`Signaling state change: ${client.peerConnection.signalingState}`);
        });
      
        client.peerConnection.addEventListener('iceconnectionstatechange ', () => {
          console.log(`ICE connection state change: ${client.peerConnection.iceConnectionState}`);
        });
    }

    return { client, createRoom, joinRoom, hangUp, registerPeerConnectionListeners };
}

export default useHangClient;