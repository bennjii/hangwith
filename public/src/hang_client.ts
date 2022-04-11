import { randomUUID } from "crypto";
import { useEffect, useState } from "react";
import { Query, RTQueryHandler, subscriptions } from "./rtq";
import { Response } from "../@types";

export type HangClient = {
    config: any,
    localStream: MediaStream,
    remoteStream: MediaStream,
    peerConnection: RTCPeerConnection,

    devices: MediaDeviceInfo[],
    currentAudio: MediaStreamTrack | null,
    currentVideo: MediaStreamTrack | null,
    sinkDevice: MediaDeviceInfo | null,

    room_id: any,
    connected: boolean,
    muted: boolean,
}

export interface HangClientParent<S> {
    client: HangClient, 
    ws: RTQueryHandler

    /**
     * `async`
     * Creates a private WebRTC 'room'.
     * Requires a Room ID Parameter.
     * 
     * *Generating a Room ID*
     * It is recommended to use `crypto.randomUUID()` on a backend service, such as in Next.js GetServerProps
     * or using `uuidv4()`. 
     * 
     * @param rid Room ID (required) 
     */
    createRoom: (rid?: string) => Promise<void>, 
    /**
     * `async`
     * Joins a pre-made WebRTC 'room'.
     * Requires a Room ID Parameter.
     * 
     * *Generating a Room ID*
     * It is recommended to use `crypto.randomUUID()` on a backend service, such as in Next.js GetServerProps
     * or using `uuidv4()`. 
     * 
     * @param room_id Room ID of existing room (required) 
     */
    joinRoom: (room_id: string) => Promise<void>, 
    /**
     * `async`
     * Leaves the current WebRTC connection
     * Removes all websocket and WebRTC connections, removes remote stream connections, clears room if empty
     * 
     * *Generating a Room ID*
     * It is recommended to use `crypto.randomUUID()` on a backend service, such as in Next.js GetServerProps
     * or using `uuidv4()`. 
     * 
     * @returns "complete" string on complete
     */
    hangUp: () => Promise<string>, 
    /**
     * `synchronous`
     * Mutes the current client
     * 
     */
    muteClient: (stream?: MediaStream) => void,
    /**
     * `synchronous`
     * UnMutes the current client
     * 
     */
    unMuteClient: (stream?: MediaStream) => void,
    /**
     * `synchronous`
     * Sets the current audio input device (audio.in)
     * 
     * @param source Media Device Source
     */
    setAudioDevice: (source: MediaDeviceInfo) => void,
    /**
     * `synchronous`
     * Sets the current audio device (video.in)
     * 
     * @param source Media Device Source
     */
    setVideoDevice: (source: MediaDeviceInfo) => void,
    /**
     * `synchronous`
     * Sets the current audio output device (audio.out)
     * 
     * @param source Media Device Source
     */
    setSpeakerDevice: Function,
}

export type HangClientProps = {
    configuration?: RTCConfiguration,
    ws: RTQueryHandler
}

export const default_config: Partial<RTCConfiguration> = {
    iceServers: [
        {
          urls: "stun:openrelay.metered.ca:80"
        },
        {
          urls: "turn:openrelay.metered.ca:80",
          username: "openrelayproject",
          credential: "openrelayproject"
        },
        {
          urls: "turn:openrelay.metered.ca:443",
          username: "openrelayproject",
          credential: "openrelayproject"
        },
        {
          urls: "turn:openrelay.metered.ca:443?transport=tcp",
          username: "openrelayproject",
          credential: "openrelayproject"
        }
    ]
};

const default_constraints = {
    video: {
        width: { ideal: 4096 },
        height: { ideal: 2160 } 
    },
    audio: {
        channelCount: 2,
        echoCancellation: false,
        latency: 0,
        sampleRate: 48000,
        sampleSize: 16
    }
}

export function useHangClient<HangClientProps>(ws: RTQueryHandler, configuration?: any): HangClientParent<HangClientProps> {
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
        sinkDevice: null,
        room_id: null,
        connected: false,
        muted: false
    }); 

    useEffect(() => {
        const start_time = new Date().getTime();
        console.log(new Date().getTime() - start_time, "Start");

        if(process.browser && !client.localStream) {
            if(navigator.mediaDevices) {
                // getDisplayMedia for sharing screen. (Add Stream)
                navigator.mediaDevices?.getUserMedia(default_constraints)
                    .then(async (stream: MediaStream) => {
                        console.log(new Date().getTime() - start_time, "Got Media");

                        const devices = await navigator.mediaDevices.enumerateDevices();

                        console.log(new Date().getTime() - start_time, "Got Devices");

                        setClient({ ...client, localStream: stream, devices, currentAudio: stream.getAudioTracks()[0], currentVideo: stream.getVideoTracks()[0], sinkDevice: devices.find(e => e.kind == "audiooutput" && e.label.includes("Default")) ?? devices.find(e => e.kind == "audiooutput") ?? null });
                    }).finally(() => {
                        console.log(new Date().getTime() - start_time, "Done.");
                    }) 
            }else {
                setClient({ ...client, localStream: new MediaStream() });
                throw new Error("Client Declined Media - Possibly Unsecure (http) Connection.");                
            }
        }   
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const createRoom = async (rid?: string) => {  
        setClient({ ...client, connected: true, peerConnection: new RTCPeerConnection(client.config) });

        registerPeerConnectionListeners();

        const room_id = rid ? rid : randomUUID();
        console.log("sending query (room)", room_id);

        await new Query(ws).in(room_id).set("room");
        console.log(`Created Room ${room_id}`)

        client.localStream?.getTracks().forEach(track => {
            console.log("Adding Track:", track);
            client.peerConnection.addTrack(track, client.localStream);
        });

        // For adding video sharing, simply gather the stream, and add the individual tracks.

        // Collect ICE candidates
        const candidates: RTCIceCandidateInit[] = [];

        client.peerConnection.addEventListener('icecandidate', async event => {
            if(!event.candidate) return;  
            candidates.push(event.candidate?.toJSON());
        }); 

        client.peerConnection.addEventListener("icegatheringstatechange", async (e) => {
            if(client.peerConnection.iceGatheringState == "complete") {
                await new Query(ws).in(room_id).update("caller_candidates", JSON.stringify(candidates));
            }
        });

        // Create a room
        const offer = await client.peerConnection.createOffer();
        await client.peerConnection.setLocalDescription(offer);

        // Create a new room with 'roomWithOffer' value. Store the generated return room's id.
        console.log("sending query update (offer)", "offer." + JSON.stringify({
            type: offer.type,
            sdp: offer.sdp
        }));

        await new Query(ws).in(room_id).update("offer", JSON.stringify({
            type: offer.type,
            sdp: offer.sdp
        }));
                
        client.room_id = room_id;
        setClient({ ...client, room_id: room_id, connected: true });

        client.peerConnection.addEventListener('track', event => {
            event.streams[0].getTracks().forEach(track => {
                console.log("Adding External Track:", track);
                client.remoteStream.addTrack(track);
            });
        });

        await new Query(ws).in(room_id).subscribe("all", async (payload: { response: Response, ref: Query }) => {
            console.log("CR:: Received Subscription Interval", payload.response);

            // TODO: Implement Delete Handling...
            // if(payload.response.type == "delete") {}
            const data = payload.response.content?.Room;

            console.log(data);

            if(data?.answer) {
                console.log("ANSWER");
                const answer = JSON.parse(data.answer) as RTCSessionDescription;

                if(!client.peerConnection.currentRemoteDescription && data && answer) {
                    const rtcSessionDescription = new RTCSessionDescription(answer);
                    await client.peerConnection.setRemoteDescription(rtcSessionDescription);
                }
            }

            if(data?.callee_candidates) {
                console.log("CANDIDATES");
                const candidates = JSON.parse(data.callee_candidates);
                if(payload.response.type.includes("callee_candidates")) {
                    candidates.forEach((candidate: RTCIceCandidateInit) => {
                        client.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                    });
                }
            }
        });
    }

    const joinRoom = async (room_id: any) => {  
        const data = await new Query(ws).in(room_id).get("all")

        if(data) {
            setClient({ ...client, peerConnection: new RTCPeerConnection(client.config), connected: true, room_id: data.response.location })

            registerPeerConnectionListeners();

            client.localStream.getTracks().forEach(track => {
                console.log("Adding Local Track:", track);
                client.peerConnection.addTrack(track, client.localStream);
            });

            const candidates: RTCIceCandidateInit[] = [];

            client.peerConnection.addEventListener('icecandidate', async event => {
                if(!event.candidate) return;  

                candidates.push(event.candidate?.toJSON());
            }); 

            client.peerConnection.addEventListener("icegatheringstatechange", async (e) => {
                if(client.peerConnection.iceGatheringState == "complete") {
                    await new Query(ws).in(room_id).update("callee_candidates", JSON.stringify(candidates));
                }
            });

            client.peerConnection.addEventListener('track', event => {
                event.streams[0].getTracks().forEach(track => {
                    console.log("Adding External Track", track)
                    client.remoteStream.addTrack(track)
                })
            });

            await client.peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.response.content?.Room?.offer as string) as RTCSessionDescriptionInit));

            const answer = await client.peerConnection.createAnswer();
            await client.peerConnection.setLocalDescription(answer);

            await new Query(ws).in(room_id).update("answer", JSON.stringify({
                type: answer.type,
                sdp: answer.sdp,
            }));

            await new Query(ws).in(room_id).subscribe("all", async (payload: { response: Response, ref: Query }) => {
                console.log("JR:: Received Subscription Interval", payload.response);
                
    
                // TODO: Implement Delete Handling...
                // if(payload.response.type == "delete") { hangUp(); return; }
                const data = payload.response.content?.Room;
                if(data?.caller_candidates) {
                    const candidates = JSON.parse(data.caller_candidates);
        
                    if(payload.response.type.includes("caller_candidates")) {
                        candidates.forEach((candidate: RTCIceCandidateInit) => {
                            client.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                        });
                    }
                }
            });
        }else {
            console.error("No Room Found with ID", room_id);
            return;
        }
    }

    const hangUp = async () => {    
        const index = subscriptions.findIndex(e => e.location == client.room_id);
        subscriptions.splice(index, 1);

        client.localStream.getTracks().forEach(track => track.stop());

        if (client.remoteStream)   client.remoteStream.getTracks().forEach(track => track.stop());
        if (client.peerConnection) client.peerConnection.close();

        //     await supabase_client
        //         .from('rooms')
        //         .delete()
        //         .match({ room_id: client.room_id });

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
        console.log(`Updating to`, source, ` and remaining keepstate`, client.localStream.getVideoTracks()[0])
        navigator.mediaDevices?.getUserMedia({
            video: {
                ...default_constraints.video,
                deviceId: client.localStream.getVideoTracks()[0].getCapabilities().deviceId
            },
            audio: {
                ...default_constraints.audio,
                deviceId: source?.deviceId                
            }
        }).then(async (stream: MediaStream) => {
            const devices = await navigator.mediaDevices.enumerateDevices().then(e => {
                return e;
            });

            console.log(`[DEVICE]: New Audio Device Set :: ${stream.getAudioTracks()[0].label}`);
            console.log(`[DEVICE]: Current Devices: MIC::[${stream.getAudioTracks()[0].label}] VIDEO::[${stream.getVideoTracks()[0].label}]`)

            setClient({ ...client, localStream: stream, devices, currentAudio: stream.getAudioTracks()[0], currentVideo: stream.getVideoTracks()[0] });

            const new_audio_track = stream.getAudioTracks()[0];

            if(client.peerConnection) 
                client.peerConnection.getSenders().forEach(e => {
                    if(e.track && e.track.kind == "audio") {
                        if(new_audio_track) e.replaceTrack(new_audio_track);
                    }
                });

            if(client.muted) 
                muteClient(stream);       
        });
    }

    const setVideoDevice = (source: MediaDeviceInfo) => {
        console.log(`Updating to`, source, `and remaining keepstate`, client.localStream.getAudioTracks()[0]);

        navigator.mediaDevices?.getUserMedia({
            audio: {
                ...default_constraints.audio,
                deviceId: client.localStream.getAudioTracks()[0].getCapabilities().deviceId
            },
            video: {
                ...default_constraints.video,
                deviceId: source?.deviceId
            }
        }).then(async (stream: MediaStream) => {
            const devices = await navigator.mediaDevices.enumerateDevices().then(e => {
                return e;
            });

            console.log(`[DEVICE]: New Video Device Set :: ${stream.getVideoTracks()[0].label}`)
            console.log(`[DEVICE]: Current Devices: MIC::[${stream.getAudioTracks()[0].label}] VIDEO::[${stream.getVideoTracks()[0].label}]`)

            setClient({ ...client, localStream: stream, devices, currentAudio: stream.getAudioTracks()[0], currentVideo: stream.getVideoTracks()[0] });

            const new_video_track = stream.getVideoTracks()[0];

            if(client.peerConnection) 
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

    const setSpeakerDevice = (source: MediaDeviceInfo) => {
        setClient({ ...client, sinkDevice: source })
    }

    return { 
        ws,
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