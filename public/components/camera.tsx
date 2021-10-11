import { useEffect, useRef, useState } from "react";

const Camera: React.FC<{ camera_stream: MediaStream, muted: boolean }> = ({ camera_stream, muted }) => {
    const [ stream, setStream ] = useState(camera_stream);
    const video_ref = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if(stream && video_ref.current && !video_ref.current.srcObject) {
            console.log(stream);
            video_ref.current.srcObject = stream;

            if(stream.getAudioTracks().length > 0) {
                const audioContext = new AudioContext();
                const microphone = audioContext.createMediaStreamSource(stream);

                console.log(microphone);
            }
        }
    }, [stream, video_ref])

    useEffect(() => {
        setStream(camera_stream);
    }, [camera_stream])

    return (
        <div>
            <div></div>
            <video ref={video_ref} autoPlay muted={muted}></video>
        </div>
    )
}

export default Camera;