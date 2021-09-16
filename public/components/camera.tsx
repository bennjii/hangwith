import { useEffect, useRef, useState } from "react";

export const Camera = (camera_stream: MediaStream | any, muted?: boolean) => {
    const [ stream, setStream ] = useState(camera_stream);
    const video_ref = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if(stream && video_ref.current && !video_ref.current.srcObject)
            video_ref.current.srcObject = stream.camera_stream;
    }, [stream, video_ref])

    return (
        <video ref={video_ref} autoPlay muted={muted ? muted : false}></video>
    )
}

export default Camera;