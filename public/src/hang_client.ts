import { v4 as uuidv4 } from 'uuid';
import { useEffect, useState } from "react";
import { SupabaseClient } from "@supabase/supabase-js";

export type HangClient = {
    config: any,
    localStream: MediaStream,
    remoteStream: MediaStream,
    peerConnection: RTCPeerConnection,

    devices: MediaDeviceInfo[],
    currentAudio: MediaStreamTrack | null,
    currentVideo: MediaStreamTrack | null,

    room_id: any,
    connected: boolean,
    muted: boolean
}

const default_config = {
    iceServers: [
        {
            urls: [
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
            ],
        },
    ],
    iceCandidatePoolSize: 10,
};

export const useHangClient = (supabase_client: SupabaseClient, configuration?: any) => {
    const [ client, setClient ] = useState<HangClient>({
        config: configuration  ? configuration : default_config,
        //@ts-expect-error
        localStream: null,
        //@ts-expect-error
        remoteStream: process.browser ? new MediaStream() : null,
        //@ts-expect-error
        peerConnection: process.browser ? new RTCPeerConnection(configuration) : null,

        devices: [],
        currentAudio: null,
        currentVideo: null,

        room_id: null,
        connected: false,
        muted: false
    }); 

    useEffect(() => {
        if(process.browser && !client.localStream) {
            if(navigator.mediaDevices) {
                // getDisplayMedia for sharing screen. (Add Stream)
                

                navigator.mediaDevices?.getUserMedia({
                    video: true,
                    audio: {
                        channelCount: 2,
                        echoCancellation: false,
                        latency: 0,
                        sampleRate: 48000,
                        sampleSize: 16
                    }
                }).then(async (stream: MediaStream) => {
                    const devices = await navigator.mediaDevices.enumerateDevices().then(e => {
                        return e;
                    });

                    // devices.forEach(e => {
                    //     console.log(`${e.groupId} ${e.label}`);
                    // })

                    // console.log(`Current `, stream.getAudioTracks()[0].getCapabilities().groupId)

                    setClient({ ...client, localStream: stream, devices, currentAudio: stream.getAudioTracks()[0], currentVideo: stream.getVideoTracks()[0] });
                });
            }else {
                setClient({ ...client, localStream: new MediaStream() });
                throw new Error("Client Declined Media - Possibly Unsecure (http) Connection.");                
            }
        }   
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const createRoom = async (rid: string) => {  
        setClient({ ...client, connected: true, peerConnection: new RTCPeerConnection(client.config)});

        registerPeerConnectionListeners();

        const room_id = 
            await supabase_client
                .from('rooms')
                .insert({
                    room_id: rid
                })
                .then(e => { 
                    return e.data?.[0].room_id;
                });
        
        // window.location.href = "./room/"+room_id;
        // return;

        client.localStream?.getTracks().forEach(track => {
            console.log(track);
            client.peerConnection.addTrack(track, client.localStream);
        });

        // For adding video sharing, simply gather the stream, and add the individual tracks.

        // Collect ICE candidates
        client.peerConnection.addEventListener('icecandidate', event => {
            if(!event.candidate) return;  

            supabase_client
                .from('rooms')
                .select()
                .match({ room_id: room_id })
                .then(e => {
                    const data = e.data?.[0];

                    if(data) {
                        const new_callers = data.caller_candidates
                              new_callers.push(event.candidate?.toJSON());

                        supabase_client
                            .from('rooms')
                            .update({ caller_candidates: new_callers })
                            .match({ room_id: room_id })
                            .then(e => e.error && console.error("Supabase Client update threw error when adding ice-candidate: ", e))
                    }
                })
        });

        // Create a room
        const offer = await client.peerConnection.createOffer();
        await client.peerConnection.setLocalDescription(offer);

        // Create a new supabase room with 'roomWithOffer' value. Store the generated return room's id.
        await supabase_client
            .from('rooms')
            .update({
                offer: {
                    type: offer.type,
                    sdp: offer.sdp
                },
            })
            .match({ room_id: room_id })
            .then(e => { 
                return e.data?.[0].room_id;
            });
                
        // client.room_id = roomId;
        setClient({ ...client, room_id: room_id });

        client.peerConnection.addEventListener('track', event => {
            event.streams[0].getTracks().forEach(track => client.remoteStream.addTrack(track));
        });

        supabase_client
            .from(`rooms:room_id=eq.${room_id}`)
            .on("*", async payload => {
                const data = payload.new;

                if(payload.eventType == "DELETE") { hangUp(); return; } 

                if(!client.peerConnection.currentRemoteDescription && data && data.answer) {
                    const rtcSessionDescription = new RTCSessionDescription(data.answer);
                    await client.peerConnection.setRemoteDescription(rtcSessionDescription);
                }

                if(payload.old?.callee_candidates !== payload.new?.callee_candidates) {
                    data.callee_candidates.forEach((candidate: RTCIceCandidateInit) => {
                        client.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                    });
                }
            }).subscribe()
    }

    const joinRoom = async (room_id: any) => {  
        const data = await supabase_client
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

            client.peerConnection.addEventListener('icecandidate', event => {
                if (!event.candidate) return;

                // Maybe quite expensive task given 4 way ping.
                supabase_client
                    .from('rooms')
                    .select()
                    .match({ room_id: room_id })
                    .then(e => {
                        const data = e.data?.[0];

                        if(data) {
                            const new_callees = data.callee_candidates
                                  new_callees.push(event.candidate?.toJSON());

                            supabase_client
                                .from('rooms')
                                .update({ callee_candidates: new_callees })
                                .match({ room_id: room_id })
                                .then(e => e.error && console.error("Supabase Client update threw error when adding ice-candidate: ", e))
                        }
                    })
            }); 

            client.peerConnection.addEventListener('track', event => {
                event.streams[0].getTracks().forEach(track => client.remoteStream.addTrack(track));
            });

            await client.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

            const answer = await client.peerConnection.createAnswer();
            await client.peerConnection.setLocalDescription(answer);

            await supabase_client
                .from('rooms')
                .update({ 
                    answer: {
                        type: answer.type,
                        sdp: answer.sdp,
                    },
                })
                .match({ room_id: room_id })

                supabase_client
                .from(`rooms:room_id=eq.${room_id}`)
                .on("*", async payload => {
                    if(payload.eventType == "DELETE") { hangUp(); return; }

                    payload.new.caller_candidates.forEach((e: RTCIceCandidateInit) => {
                        client.peerConnection.addIceCandidate(new RTCIceCandidate(e))
                    })
                }).subscribe()
        }
    }

    const hangUp = async () => {    
        await supabase_client.getSubscriptions().forEach(subscription => subscription.unsubscribe());

        // client.localStream.getTracks().forEach(track => track.stop());

        if (client.remoteStream)   client.remoteStream.getTracks().forEach(track => track.stop());
        if (client.peerConnection) client.peerConnection.close();
        if (client.room_id) {
            // await supabase_client.getSubscriptions().forEach(e => supabase_client.removeSubscription(e));

            await supabase_client
                .from('rooms')
                .delete()
                .match({ room_id: client.room_id });
        }

        console.log(supabase_client);

        setClient({ ...client, connected: false, room_id: null, peerConnection: new RTCPeerConnection(client.config) });
        return "complete";
    }

    const registerPeerConnectionListeners = () => {
        client.peerConnection.addEventListener('icegatheringstatechange', (ev) => {
          console.log(`[EVT] ICE GATHERING: ${client.peerConnection.iceGatheringState}`, ev);
        });
      
        client.peerConnection.addEventListener('connectionstatechange', (ev) => {
          console.log(`[EVT] CONNECTION STATE: ${client.peerConnection.connectionState}`, ev);
        });
      
        client.peerConnection.addEventListener('signalingstatechange', (ev) => {
          console.log(`[EVT] SIGNALING STATE: ${client.peerConnection.signalingState}`, ev);
        });
      
        client.peerConnection.addEventListener('iceconnectionstatechange ', (ev) => {
          console.log(`[EVT] ICE CONNECTION: ${client.peerConnection.iceConnectionState}`, ev);
        });
    }

    const muteClient = (stream?: MediaStream) => {
        if(stream) {
            stream.getAudioTracks().forEach(e => {
                e.enabled = false;
            }); 
        }else {
            client.localStream.getAudioTracks().forEach(e => {
                e.enabled = false;
            });
        }

        setClient({ ...client, muted: true });
    }

    const unMuteClient = (stream?: MediaStream) => {
        if(stream) {
            stream.getAudioTracks().forEach(e => {
                e.enabled = true;
            }); 
        }else {
            client.localStream.getAudioTracks().forEach(e => {
                e.enabled = true;
            });
        }
        
        setClient({ ...client, muted: false });
    }

    const setAudioDevice = (source: MediaDeviceInfo) => {
        navigator.mediaDevices?.getUserMedia({
            video: true,
            audio: {
                echoCancellation: true,
                deviceId: source?.deviceId
            }
        }).then(async (stream: MediaStream) => {
            const devices = await navigator.mediaDevices.enumerateDevices().then(e => {
                return e;
            });

            console.log(`[DEVICE]: New Audio Device Set :: ${stream.getAudioTracks()[0].label}`)

            setClient({ ...client, localStream: stream, devices, currentAudio: stream.getAudioTracks()[0], currentVideo: stream.getVideoTracks()[0] });

            const new_audio_track = stream.getAudioTracks()[0];

            client.peerConnection.getSenders().forEach(e => {
                if(e.track && e.track.kind == "audio") {
                    if(new_audio_track) e.replaceTrack(new_audio_track);
                }
            });

            if(client.muted) {
                muteClient(stream);       
            }
        });
    }

    const setVideoDevice = (source: MediaDeviceInfo) => {
        console.log(`Updating to ${source.deviceId} and remaining keepstate`, client.currentAudio)
        navigator.mediaDevices?.getUserMedia({
            audio: {
                echoCancellation: true,
                deviceId: client.currentAudio?.id
            },
            video: {
                echoCancellation: true,
                deviceId: source?.deviceId
            }
        }).then(async (stream: MediaStream) => {
            const devices = await navigator.mediaDevices.enumerateDevices().then(e => {
                return e;
            });

            console.log(`[DEVICE]: New Video Device Set :: ${stream.getVideoTracks()[0].label}`)

            setClient({ ...client, localStream: stream, devices, currentAudio: stream.getAudioTracks()[0], currentVideo: stream.getVideoTracks()[0] });

            const new_video_track = stream.getVideoTracks()[0];

            client.peerConnection.getSenders().forEach(e => {
                if(e.track && e.track.kind == "video") {
                    if(new_video_track) e.replaceTrack(new_video_track);
                }
            });

            console.log(stream);

            if(client.muted) {
                muteClient(stream);       
            }
        });
    }

    const setSpeakerDevice = () => {

    }

    return { 
        client, 
        createRoom, 
        joinRoom, 
        hangUp, 
        muteClient,
        unMuteClient,
        setAudioDevice,
        setVideoDevice,
        setSpeakerDevice,
    };
}


export default useHangClient;