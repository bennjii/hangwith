import { useEffect, useRef, useState } from "react";
import styles from '../../styles/Home.module.css'
import Loader from "./un-ui/loader";

const Camera: React.FC<{ camera_stream: MediaStream, muted: boolean, height?: number, audioBar?: boolean }> = ({ camera_stream, muted, height, audioBar=true }) => {
    const [ stream, setStream ] = useState(camera_stream);
    const [ volume, setVolume ] = useState(0);
    const [ cameraOn, setCameraOn ] = useState(false);
    const video_ref = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        setCameraOn(true);
        
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

                        setVolume(_volume)
                    }

                    microphone.port.onmessage = handleListener;

                    return () => {
                        microphone.port.removeEventListener("message", handleListener);
                    };
                }).catch(e => console.error(e));
            }else {
                setVolume(0);
            }
        }else if(stream && video_ref.current) {
            video_ref.current.srcObject = stream;
        }else {
            setVolume(0);
        }
    }, [stream, video_ref]);

    useEffect(() => {
        console.log(`Stream Change!`);
        if(!camera_stream) return;

        setStream(camera_stream);

        camera_stream.onaddtrack = () => setStream({ ...camera_stream });
        camera_stream.onremovetrack = () => setStream({ ...camera_stream });

        return () => {
            camera_stream.removeEventListener("addtrack", () => setStream({ ...camera_stream }));
            camera_stream.removeEventListener("removetrack", () => setStream({ ...camera_stream }));
        }
    }, [camera_stream]);

    return (
        <div style={{ height: height ?? 'inherit' }}>
            {
                cameraOn 
                ? 
                <video style={{ height: height ? height : 'inherit' }} ref={video_ref} autoPlay muted={muted}></video>
                :
                <Loader height={25} color={"#fff"}/>
            }

            {
                audioBar ? <div style={{ width: `${Math.round(volume * 100 * 2)}%` }} className={styles.talkingBar}></div> : <></>
            }
        </div>
    )
}

export default Camera;