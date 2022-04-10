import useHangClient from "@public/src/hang_client";
import { HangClientContext } from "@root/pages";
import { useContext, useEffect, useRef, useState } from "react";
import styles from '../../styles/Home.module.css'
import Loader from "./un-ui/loader";

const Camera: React.FC<{ _stream: MediaStream, muted: boolean, height?: number, width?: number, depth: number, show_audio_bar?: boolean, show_resolution?: boolean }> = ({ _stream, muted, height, width, depth, show_audio_bar=true, show_resolution=false }) => {
    const [ stream, setStream ] = useState(_stream);
    const [ volume, setVolume ] = useState(0);
    const [ cameraOn, setCameraOn ] = useState(false);
    const [ ctx, setCtx ] = useState<AudioContext>();
    const [ resolution, setResolution ] = useState(0);

    const video_ref = useRef<HTMLVideoElement>(null);
    
    const client = useContext(HangClientContext);

    useEffect(() => {
        if(video_ref.current && client && client?.sinkDevice) {
            //@ts-expect-error
            video_ref?.current.setSinkId(client?.sinkDevice?.deviceId)
        }
    }, [client])

    useEffect(() => {
        setCameraOn(true);
        
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
	// eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stream, video_ref]);

    useEffect(() => {
        if(!_stream) return;

        setStream(_stream);
        setResolution(_stream?.getVideoTracks()?.[0]?.getCapabilities()?.height?.max ?? 0)

        console.log("Camera Update Received.", _stream)

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
        <div className="relative bg-black" style={{ height: height ?? 'inherit' }}>
            {
                show_resolution && stream ? 
                    <p className="absolute bottom-2 left-2 bg-gray-800 bg-opacity-80 px-2 py-1 rounded-lg text-white text-opacity-80">
                        {
                            (() => {
                                switch(resolution) {
                                    case 720:
                                        return "720p"
                                    case 1080:
                                        return "1080p"
                                    case 1440:
                                        return "1440p"
                                    case 2160:
                                        return "4K"
                                    case 4320:
                                        return "8K"
                                    default:
                                        return `${resolution}p`
                                }
                            })()
                        }
                    </p>
                :
                    <></>
            }
            
            {
               stream
               ? <video style={{ height: height ? height : 'inherit', width: width ? width : 'inherit' }} ref={video_ref} autoPlay muted={muted}></video>
               : <div style={{ height: height ? height : 'inherit', width: width ? width : 'inherit' }} className=" w-96 flex flex-col items-center justify-center flex-1 h-full"> <Loader height={25} color={"#fff"}/> </div>
            }

            {
                show_audio_bar ? <div style={{ position: 'absolute', bottom: '0', left: '0', width: `${Math.round(volume * 100)}%`, height: '10px', transition: '0.1s ease all' }} className="bg-[#55b17c]"></div> : <></>
            }
        </div>
    )
}

export default Camera;