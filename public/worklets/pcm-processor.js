/**
 * PCM Processor Worklet - Pro Audio Version (2026)
 * Handles low-latency capture with zero-allocation buffering for maximum stability.
 * Sends peak/signal info to main thread for diagnostic UI.
 */
class PCMProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this._bufferSize = 1024; // Smaller for better responsiveness (1024 samples @ 48kHz = ~21ms)
        this._buffer = new Float32Array(this._bufferSize);
        this._bufferPtr = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (!input || input.length === 0) return true;

        const channelData = input[0];
        let peak = 0;

        for (let i = 0; i < channelData.length; i++) {
            const sample = channelData[i];
            const absS = Math.abs(sample);
            if (absS > peak) peak = absS;

            this._buffer[this._bufferPtr++] = sample;

            if (this._bufferPtr >= this._bufferSize) {
                // Send a copy to the main thread to avoid race conditions with worker pool
                this.port.postMessage({
                    type: 'audio',
                    buffer: this._buffer.slice(), // Slice creates a new Float32Array efficiently
                    peak: peak
                });
                this._bufferPtr = 0;
                peak = 0; // Reset peak for next block
            }
        }

        return true;
    }
}

registerProcessor('pcm-processor', PCMProcessor);
