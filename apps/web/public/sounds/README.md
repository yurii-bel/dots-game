# Sound assets

Replace files in place to change cues. Keep the same filenames so code paths stay stable.

Playback uses the Web Audio API (`AudioContext` + pre-decoded `AudioBuffer`, fresh
`AudioBufferSourceNode` per play, single gain ≤ 1). Do not re-encode hot or add
processing in the player — swap the file if the cue itself needs to change.

| File | Cue | Notes |
| --- | --- | --- |
| `place-dot.ogg` | Dot placement (`game:move:accepted`) | Authored stereo tap; played at unity gain |
