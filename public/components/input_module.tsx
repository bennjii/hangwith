import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Check, Mic, Speaker, Volume2, X } from "react-feather";
import styles from '../../styles/Home.module.css'
import useHangClient, { HangClient, HangClientParent } from "../src/hang_client";
import { supabase } from '../../public/src/client'
import DropDown from "./un-ui/dropdown";

const InputModule: React.FC<{ _stream: MediaStream, muted: boolean, depth: number, type: string, client: HangClient, audioCallback?: Function, speakerCallback?: Function, videoCallback?: Function, defaultDevice: string, verificationCallback: Function, v: [number, number, number], hang_client: HangClientParent<null> }> = ({ _stream, muted, depth, type, client, audioCallback, speakerCallback, videoCallback, defaultDevice, verificationCallback, v, hang_client }) => {
    const [ stream, setStream ] = useState(_stream);
    const [ volume, setVolume ] = useState(0);
    const [ ctx, setCtx ] = useState<AudioContext>();
    const [ verif, setVerif ] = useState("awaiting");

    const video_ref = useRef<HTMLVideoElement>(null);

    const refType = () => {
        if(type == "audio.in") return "audioinput";
        if(type == "audio.out") return "audiooutput";
        if(type == "video.in") return "videoinput";
        return "audioinput";
    }

    useEffect(() => {
        if(type == "audio.in" && stream?.getAudioTracks()?.[0]) {
            if((volume > 0.15 && type == "audio.in") || verif == "truthy") {
                setVerif("truthy");
    
                const b = v;
                b[0] = 1;
    
                verificationCallback([...b]);
            }else if(type == "audio.in") {
                setVerif("awaiting");
    
                const b = v;
                b[0] = 0;
    
                verificationCallback([...b]);
            }
        }else if(!stream){
            setVerif("awaiting");
    
            const b = v;
            b[0] = 0;
    
            verificationCallback([...b]);
        }else {
            setVerif("falsy");

            const b = v;
            b[0] = 2;

            verificationCallback([...b]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [volume, type]);
    
    useEffect(() => {    
        if(type == "audio.in") {
            if(stream && video_ref.current) {
                if(!video_ref.current.srcObject) video_ref.current.srcObject = stream;

                if(stream.getAudioTracks().length > 0) {
                    const asy = async () => {
                        await ctx?.close();
                        setCtx(createWorklet());
                    }

                    asy();
                }else {
                    setVolume(0);
                }
            }else {
                setVolume(0);
            }
        }else {
            setVolume(0);
        }
        
        if(type == "video.in") {
            if(stream?.getVideoTracks()?.length) {
                setVerif("truthy")
                const b = v;
                b[2] = 1;
                verificationCallback([...b]);
            }
            else if(!stream){
                setVerif("awaiting");
        
                const b = v;
                b[2] = 0;
        
                verificationCallback([...b]);
            }else {
                setVerif("falsy");
    
                const b = v;
                b[2] = 2;
    
                verificationCallback([...b]);
            }
        }

        if(type == "audio.out") {
            if(client.sinkDevice?.deviceId) {
                setVerif("truthy");
                const b = v;
                b[1] = 1;
                verificationCallback([...b]);
            }
            else if(!stream){
                setVerif("awaiting");
        
                const b = v;
                b[1] = 0;
        
                verificationCallback([...b]);
            }else {
                setVerif("falsy");
    
                const b = v;
                b[1] = 2;
    
                verificationCallback([...b]);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [, stream, video_ref, type]);

    useEffect(() => {
        if(!_stream) return;

        setVerif("awaiting");
        setStream(_stream);

        _stream.onaddtrack = () => setStream({ ..._stream });
        _stream.onremovetrack = () => setStream({ ..._stream });

        return () => {
            _stream.removeEventListener("addtrack", () => setStream({ ..._stream }));
            _stream.removeEventListener("removetrack", () => setStream({ ..._stream }));
        }
    }, [_stream]);

    const createWorklet = () => {
        const _ctx = new AudioContext();
        var time = new Date().getTime();

        _ctx.audioWorklet.addModule(`${Array(depth+1).join("../")}components/audio_processor.js`).then(() => {
            const microphone = new AudioWorkletNode(_ctx, "client-audio-processing", {
                numberOfInputs: 1,
                numberOfOutputs: 1
            });

            microphone.connect(_ctx.destination);

            const src = _ctx.createMediaStreamSource(_stream);
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

        return _ctx;
    }

    return (
        <div className="flex flex-row items-center justify-between bg-[#101418] flex-1 p-1 rounded-lg w-full gap-0 pr-2">   
            <video style={{ display: 'none' }} ref={video_ref} autoPlay muted={muted}></video>

            <div className="flex flex-center align-center bg-[#181b20] p-2 rounded-lg relative overflow-hidden mr-2">
                {
                    (() => {
                        switch(type) {
                            case "audio.in":
                                return _stream?.getAudioTracks()?.[0]?.enabled ?
                                    <Image src={"/icons/mic.svg"} alt="Microphone On" height={20} width={20} className="z-50" onClick={() => hang_client.muteClient()} />
                                    :
                                    <Image src={"/icons/muted.svg"} alt="Microphone On" height={20} width={20} className="z-50" onClick={() => hang_client.unMuteClient()}/>
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

                <div style={{ position: 'absolute', bottom: '0', left: '0', height: `${Math.round(volume * 100)}%`, width: '40px', transition: '0.1s ease all' }} className="bg-[#55b17c]"></div>
            </div>

            <div className="flex-1 text-white w-full">
                <DropDown 
                        options={client.devices.filter(e => e.kind == refType() && e.deviceId !== "default" && e.deviceId !== "communications")} 
                        defaultValue={defaultDevice} 
                        parameter={"label"} 
                        valueParameter={"groupId"}
                        callback={(e: any) => { {
                            setVerif("awaiting");

                            const source = client.devices.find(__ => __.groupId == e && __.kind == refType());
                            if(source) { 
                                if(audioCallback) audioCallback(source)
                                else if(videoCallback) videoCallback(source);
                                else if(speakerCallback) speakerCallback(source);
                            }
                        }}}
                    />
            </div>

            {
                (() => {
                    switch(v[type == "audio.in" ? 0 : type == "audio.out" ? 1 : 2]) {
                        case 0:
                            return (
                                <div className="h-7 w-7 rounded-xl items-center justify-center flex bg-orange-300">
                                    <Image src={"/icons/waiting.svg"} alt="Checking" height={20} width={20} className="z-50"/>
                                </div>
                            )
                        case 1:
                            return (
                                <div className="h-7 w-7 rounded-xl items-center justify-center flex bg-[#55b17c]">
                                    <Image src={"/icons/check.svg"} alt="Working" height={20} width={20} className="z-50"/>
                                </div>
                            )
                        case 2:
                            return (
                                <div className="h-7 w-7 rounded-xl items-center justify-center flex bg-red-400">
                                    <Image src={"/icons/cross.svg"} alt="Working" height={20} width={20} className="z-50"/>
                                </div>  
                            )
                    }
                })()
            }
        </div>
    )
}

export default InputModule;