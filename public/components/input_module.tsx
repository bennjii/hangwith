import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Mic, Speaker, Volume2 } from "react-feather";
import styles from '../../styles/Home.module.css'
import useHangClient, { HangClient } from "../src/hang_client";
import { supabase } from '../../public/src/client'
import DropDown from "./un-ui/dropdown";

const InputModule: React.FC<{ _stream: MediaStream, muted: boolean, type: string, client: HangClient, audioCallback?: Function, speakerCallback?: Function, videoCallback?: Function }> = ({ _stream, muted, type, client, audioCallback, speakerCallback, videoCallback }) => {
    const [ stream, setStream ] = useState(_stream);
    const [ volume, setVolume ] = useState(0);

    const video_ref = useRef<HTMLVideoElement>(null);

    const refType = () => {
        if(type == "audio.in") return "audioinput";
        if(type == "audio.out") return "audiooutput";
        if(type == "video.in") return "videoinput";
        return "audioinput";
    }
    
    useEffect(() => {
        if(type == "audio.in") {
            var time = new Date().getTime();

            console.log(`Effect Called!`);
            
            if(stream && video_ref.current && !video_ref.current.srcObject) {
                console.log(stream);
                video_ref.current.srcObject = stream;

                if(stream.getAudioTracks().length > 0) {
                    const ctx = new AudioContext();
                    
                    ctx.audioWorklet.addModule("components/audio_processor.js").then(() => {
                        const microphone = new AudioWorkletNode(ctx, "client-audio-processing", {
                            numberOfInputs: 1,
                            numberOfOutputs: 1
                        });

                        microphone.connect(ctx.destination);

                        const src = ctx.createMediaStreamSource(stream);
                        src.connect(microphone);

                        const handleListener = (event: any) => {
                            let _volume = 0
                            if (event.data.volume)
                                _volume = event.data.volume;

                            const dt = new Date().getTime();
                            if(dt-time > 25) { 
                                setVolume(_volume);
                                time = dt;
                            }
                        }

                        microphone.port.onmessage = handleListener;

                        return () => {
                            microphone.port.removeEventListener("message", handleListener);
                        };
                    }).catch(e => console.error(e));
                }else {
                    setVolume(0);
                }
            }else {
                setVolume(0);
            }

            console.log(stream);
        }else {
            ///... do nothing?
        }

    }, [stream, video_ref, type]);

    useEffect(() => {
        if(!_stream) return;

        setStream(_stream);

        _stream.onaddtrack = () => setStream({ ..._stream });
        _stream.onremovetrack = () => setStream({ ..._stream });

        return () => {
            _stream.removeEventListener("addtrack", () => setStream({ ..._stream }));
            _stream.removeEventListener("removetrack", () => setStream({ ..._stream }));
        }
    }, [_stream]);


    return (
        <div className="flex flex-row items-center justify-between bg-[#101418] flex-1 p-1 rounded-lg w-full gap-4">   
            <video style={{ display: 'none' }} ref={video_ref} autoPlay muted={muted}></video>

            <div className="flex flex-center align-center bg-[#181b20] p-2 rounded-lg relative overflow-hidden">
                {
                    (() => {
                        switch(type) {
                            case "audio.in":
                                return (
                                    <Image src={"/icons/mic.svg"} alt="Microphone On" height={20} width={20} className="z-50"/>
                                )
                            case "audio.out":
                                return (
                                    <Image src={"/icons/speaker.svg"} alt="Speaker On" height={20} width={20} className="z-50"/>
                                )
                            case "video.in":
                                return (
                                    <Image src={"/icons/video.svg"} alt="Video On" height={20} width={20} className="z-50"/>
                                )
                            default:
                                return <p>Unknown Input Module Type, {type}</p>
                        }
                    })()
                }

                <div style={{ position: 'absolute', bottom: '0', left: '0', height: `${Math.round(volume * 100 * 2)}%`, width: '40px', transition: '0.1s ease all' }} className="bg-[#55b17c]"></div>
            </div>

            <div className="flex-1 text-white w-full">
                <DropDown 
                        options={client.devices.filter(e => e.kind == refType() && e.deviceId !== "default" && e.deviceId !== "communications")} 
                        defaultValue={client.currentAudio?.getCapabilities().groupId} 
                        parameter={"label"} 
                        valueParameter={"groupId"}
                        callback={(e: any) => { {
                            const source = client.devices.find(__ => __.groupId == e && __.kind == refType());
                            if(source) { 
                                if(audioCallback) audioCallback(source)
                                else if(videoCallback) videoCallback(source);
                                else if(speakerCallback) speakerCallback(source);
                            }
                        }}}
                    />
            </div>
        </div>
    )
}

export default InputModule;