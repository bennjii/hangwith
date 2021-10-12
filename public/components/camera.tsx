import { useEffect, useRef, useState } from "react";
import styles from '../../styles/Home.module.css'

const Camera: React.FC<{ camera_stream: MediaStream, muted: boolean }> = ({ camera_stream, muted }) => {
    const [ stream, setStream ] = useState(camera_stream);
    const [ volume, setVolume ] = useState(0);
    const video_ref = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if(stream && video_ref.current && !video_ref.current.srcObject) {
            console.log(stream);
            video_ref.current.srcObject = stream;

            if(stream.getAudioTracks().length > 0) {
                setVolume(0);
                
                const ctx = new AudioContext();
                const microphone = ctx.createScriptProcessor(2048, 1, 1);
                microphone.connect(ctx.destination);

                const minUpdateRate = 50;
		        let lastRefreshTime = 0;

                const handleProcess = (event: AudioProcessingEvent) => {
                    // limit update frequency
                    if (event.timeStamp - lastRefreshTime < minUpdateRate) {
                        return;
                    }
        
                    // update last refresh time
                    lastRefreshTime = event.timeStamp;
        
                    const input = event.inputBuffer.getChannelData(0);
                    const total = input.reduce((acc, val) => acc + Math.abs(val), 0);
                    const rms = Math.min(0.5, Math.sqrt(total / input.length));
                    setVolume(rms);
                };

                const src = ctx.createMediaStreamSource(stream);
				src.connect(microphone);
				microphone.addEventListener('audioprocess', handleProcess);

                return () => {
                    microphone.removeEventListener('audioprocess', handleProcess);
                };
            }
        }
    }, [stream, video_ref])

    useEffect(() => {
        setStream(camera_stream);
    }, [camera_stream])

    return (
        <div>
            <div style={{ width: `${Math.round(volume * 2 * 100)}%` }} className={styles.talkingBar}></div>
            <video ref={video_ref} autoPlay muted={muted}></video>
        </div>
    )
}

export default Camera;