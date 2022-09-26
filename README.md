# `Hangwith API`

The Hangwith API is a [WebRTC](https://webrtc.org/) layer built using [supabase](https://supabase.io/), that allows for incredibly easy WebRTC integration with build-in native **react** components, and a [useHook](https://reactjs.org/docs/hooks-intro.html) library.

With incredibly easy integration, connecting users to a call is as simple as:

```tsx
const { createRoom } = useHangClient(supabase);

return (
    <div>
        <a onClick={() => createRoom()}>Create Room!</a>
    </div>
)
```

### Quick Start

#### Install
~~npm install hangwith-client~~ Not yet available on NPM.

####  Usage
The useHook library includes a large variety of extensible functions and variables.

`client`, `createRoom()`, `joinRoom()`, `hangUp()`, `muteClient()`, `unMuteClient()`, `setAudioDevice()`

## Licence
This repo is licensed under MIT License.
