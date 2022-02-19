const SMOOTHING_FACTOR = 0.8;
const MINIMUM_VALUE = 0.00001;

export default class AudioProcessor extends AudioWorkletProcessor {
	_volume
	_updateIntervalInMS
	_nextUpdateFrame

    constructor() {
		super();
		this._volume = 0;
		this._updateIntervalInMS = 25;
		this._nextUpdateFrame = this._updateIntervalInMS;
		this.port.onmessage = event => {
			if (event.data.updateIntervalInMS)
			this._updateIntervalInMS = event.data.updateIntervalInMS;
		}
    }

	get intervalInFrames () {
		return this._updateIntervalInMS / 1000 * sampleRate;
	}
  
    process(inputs, outputs, parameters) {
		const input = inputs[0];
		const output = outputs[0];

		// Note that the input will be down-mixed to mono; however, if no inputs are
		// connected then zero channels will be passed in.
		if (input.length > 0) {
			// console.log(inputs[0]);

			const sum = input.reduce((acc, val) => acc + val.reduce((acc, val) => acc + Math.abs(val), 0), 0);
			const rms = Math.sqrt(sum / (input[0].length + input[1].length));

			this._volume = Math.min(rms, 1);

			// Update and sync the volume property with the main thread.
			this._nextUpdateFrame -= input[0].length;

			if (this._nextUpdateFrame < 0) {
				this._nextUpdateFrame += this.intervalInFrames;
				this.port.postMessage({volume: this._volume});
			}

			// for (let channel = 0; channel < input.length; channel++) {
			// 	const inputChannel = input[channel];
			// 	const outputChannel = output[channel];
			
			// 	for (let i = 0; i < inputChannel.length; i++) {
			// 		outputChannel[i] = inputChannel[i];
			// 	}
			// }
		}
		
		return true;
    }
};
  
registerProcessor("client-audio-processing", AudioProcessor);