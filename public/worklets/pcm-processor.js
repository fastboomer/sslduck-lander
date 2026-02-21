/**
 * PCM Processor Worklet - High Fidelity Version
 * Handles low-latency capture and sends peak/signal info to main thread.
 */
class PCMProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this._bufferSize = 2048; // Smaller buffer for better responsiveness
        this._buffer = new Float32Array(this._bufferSize);
        this._bufferPtr = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input.length > 0) {
            const channelData = input[0];
            let peak = 0;

            for (let i = 0; i < channelData.length; i++) {
                const sample = channelData[i];
                const absSample = Math.abs(sample);
                if (absSample > peak) peak = absSample;

                this._buffer[this._bufferPtr++] = sample;

                if (this._bufferPtr >= this._bufferSize) {
                    // Send buffer to main thread
                    this.port.postMessage({
                        type: 'audio',
                        buffer: this._buffer,
                        peak: peak
                    });
                    // Reset buffer
                    this._buffer = new Float32Array(this._bufferSize);
                    this._bufferPtr = 0;
                }
            }

            // Periodically send a state message if signal is detected
            if (peak > 0.001) {
                // Main thread will use this for the meter if needed
            }
        }
        return true;
    }
}

registerProcessor('pcm-processor', PCMProcessor);
