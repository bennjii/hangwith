import { supabase } from "./client";
import { v4 as uuidv4 } from 'uuid';

export default class HangClient {
    constructor(configuration: any, self_propogate: Function) {
        this.config = configuration;
        this.self_propogate = self_propogate;
        this.remoteStream = new MediaStream();

        if(!process.browser) 
            this.localStream = new MediaStream();
        else 
            navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            }).then((stream: MediaStream) => {
                this.localStream = stream;
            });  
    }

    config: { iceServers: { urls: string[] }[], iceCandidatePoolSize: number }
    self_propogate: Function;
    localStream!: MediaStream 
    remoteStream: MediaStream
    peerConnection!: RTCPeerConnection
    room_id!: any

    async createRoom() {
        this.peerConnection = new RTCPeerConnection(this.config);
        console.log(this.peerConnection);

        this.registerPeerConnectionListeners();

        this.localStream?.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, this.localStream);
        });

        const caller_candidates: RTCIceCandidateInit[] = [];

        // Collect ICE candidates
        this.peerConnection.addEventListener('icecandidate', event => {
            if (!event.candidate) return;      
            caller_candidates.push(event.candidate.toJSON()) 
        });

        console.log(caller_candidates);

        // Create a room
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);

        console.log(this.peerConnection)

        // Create a new supabase room with 'roomWithOffer' value. Store the generated return room's id.
        this.room_id = 
            await supabase
                .from('rooms')
                .insert({
                    room_id: uuidv4(),
                    offer: {
                        type: offer.type,
                        sdp: offer.sdp
                    },
                    caller_candidates
                })
                .then(e => { 
                    return e.data?.[0].room_id;
                });

        console.log(this.room_id, this)

        this.peerConnection.addEventListener('track', event => {
            event.streams[0].getTracks().forEach(track => this.remoteStream.addTrack(track));
        });

        // this.self_propogate(this);

        // Listen for changes to room, such as an answer 
        // Example in firebase:
        //
        //  roomRef.onSnapshot(async snapshot => {
        //     const data = snapshot.data();
        //     if (!peerConnection.currentRemoteDescription && data && data.answer) {
        //       console.log('Got remote description: ', data.answer);
        //       const rtcSessionDescription = new RTCSessionDescription(data.answer);
        //       await peerConnection.setRemoteDescription(rtcSessionDescription);
        //     }
        //   });
        //
        //  Listen for changes to ICE candidates
        //  roomRef.collection('calleeCandidates').onSnapshot(snapshot => {
        //      snapshot.docChanges().forEach(async change => {
        //        if (change.type === 'added') {
        //          let data = change.doc.data();
        //          console.log(`Got new remote ICE candidate: ${JSON.stringify(data)}`);
        //          await peerConnection.addIceCandidate(new RTCIceCandidate(data));
        //        }
        //      });
        //  });
        //
        // Supabase:
        supabase
            .from(`rooms:room_id=eq.${this.room_id}`)
            .on("*", async payload => {
                const data = payload.new.data[0];

                if(!this.peerConnection.currentRemoteDescription && data && data.answer){
                    const rtcSessionDescription = new RTCSessionDescription(data.answer);
                    await this.peerConnection.setRemoteDescription(rtcSessionDescription);
                }

                // Check if ICE candidates change, if so add new ICE candidate to peer connection
                console.log(payload.old, payload.new)
                if(payload.old.data[0].callee_candidates !== data.callee_candidates) {
                    this.peerConnection.addIceCandidate(new RTCIceCandidate(data.callee_candidates));
                }
            }).subscribe()
    }

    async joinRoom(room_id: string) {
        const data = await supabase
            .from('rooms')
            .select()
            .match({ id: room_id })
            .then(async e => {
                return e?.data?.[0];
            });

        if(data) {
            this.peerConnection = new RTCPeerConnection(this.config);

            this.registerPeerConnectionListeners();

            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });

            this.peerConnection.addEventListener('icecandidate', event => {
                if (!event.candidate) return;

                supabase
                    .from('rooms')
                    // APPEND DONT JUST SET
                    .update({
                        callee_candidates: event.candidate.toJSON()
                    });
            });   

            this.peerConnection.addEventListener('track', event => {
                event.streams[0].getTracks().forEach(track => this.remoteStream.addTrack(track));
            });

            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);

            await supabase
                .from('rooms')
                .update({ answer: {
                    type: answer.type,
                    sdp: answer.sdp,
                }})
                .match({ id: room_id });

            supabase
                .from(`rooms:room_id=eq.${room_id}`)
                .on("*", payload => {
                    this.peerConnection.addIceCandidate(new RTCIceCandidate(payload.new))
                }).subscribe()
        }
    }

    async hangUp() {    
        if(this.remoteStream) this.remoteStream.getTracks().forEach(track => track.stop());
        if (this.peerConnection) this.peerConnection.close();
        
        if(this.room_id) {
            const data = await supabase
                .from('rooms')
                .select()
                .match({ room_id: this.room_id })
                .then(e => e?.data?.[0]);

            data.callee_candidates.forEach(async (candidate: any) => {
                await candidate.ref.delete();
            });

            data.caller_candidates.forEach(async (candidate: any) => {
                await candidate.ref.delete();
            });

            await supabase
                .from('rooms')
                .delete()
                .match({ room_id: this.room_id });
        }
    }

    registerPeerConnectionListeners() {
        this.peerConnection.addEventListener('icegatheringstatechange', () => {
          console.log(`ICE gathering state changed: ${this.peerConnection.iceGatheringState}`);
        });
      
        this.peerConnection.addEventListener('connectionstatechange', () => {
          console.log(`Connection state change: ${this.peerConnection.connectionState}`);
        });
      
        this.peerConnection.addEventListener('signalingstatechange', () => {
          console.log(`Signaling state change: ${this.peerConnection.signalingState}`);
        });
      
        this.peerConnection.addEventListener('iceconnectionstatechange ', () => {
          console.log(`ICE connection state change: ${this.peerConnection.iceConnectionState}`);
        });
    }
}