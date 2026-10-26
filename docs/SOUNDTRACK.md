# Story Edition 03 soundtrack

The v0.2 score used the same sine-wave pad instrument and four slow chord sequences. v0.3 replaces it with nine original instrumental compositions, each with an authored motif, key, tempo, comping pattern and rhythm section. No vocals or third-party songs are included.

| Cue | Korean title | BPM | Arrangement |
| --- | --- | --- | --- |
| day | 407호의 좋은 예감 | 98 | Electric piano, electric bass, vibes, swung lo-fi drums |
| evening | 데이트는 스윙으로 | 114 | Piano, walking upright bass, vibes, ride cymbal |
| night | 막차 하나 전까지 | 94 | Clean guitar, electric bass, Rhodes, neo-soul beat |
| confession | 대답을 기다리는 박자 | 88 | Piano, cello bass, nylon guitar, light rhythmic pulse |
| tense | 마감 10분 전 | 120 | Pizzicato strings, picked bass, short piano figures, drums |
| jian | 선배의 반칙 | 106 | Syncopated Rhodes, bass, vibes and funk drums |
| narae | 별표 친 오후 | 118 | Nylon guitar, upright bass, clarinet and bossa percussion |
| seoha | ON AIR, 너에게만 | 112 | Clavinet, picked bass, alto sax and city-pop beat |
| iseo | 한 바퀴 더, 너와 | 126 | Clean/overdriven guitars, picked bass and rock drums |

Each cue lasts 40 bars (76–109 seconds), with an introduction, A section, answering B section, return and turnaround. The arrangement changes through the cue. The intent is readable dialogue over an active melodic rhythm, rather than a slow ambient pad.

## Playback

`scoreForScene` prioritizes conflict, confession and date beats over the heroine theme. Other night scenes use the night cue. Merely changing a line does not restart the score. The title shows no autoplay music; the first real interaction unlocks the AudioContext. Playback uses decoded AudioBuffer sources, fades between cues, respects volume/mute, cancels stale loads and retains at most two decoded tracks. A failed media load does not prevent reading.

The render includes two complete cycles and extracts the second cycle so instrument tails from the previous bar are present at the loop start. An 8 ms edge fade prevents an abrupt wrap. MP3 output uses 44.1 kHz stereo, 112 kbps, FFmpeg loudness normalization targeting −20 LUFS and −2 dBTP. `audio:check` verifies the actual decoded duration, peak, RMS, uniqueness and edge samples. Browser tests also decode all nine files and exercise playback/mute. These checks verify technical behavior; they do not replace a human listening and musical taste review.

## Sources and credits

- Composition/arrangement: original project score, authored in [`compose-score.mjs`](../scripts/compose-score.mjs). Editable MIDI is in [`audio/source`](../audio/source).
- Sample instruments: **GeneralUser GS 2.0.3**, S. Christian Collins. [Official repository](https://github.com/mrbumpy409/GeneralUser-GS), [author's site](https://www.schristiancollins.com/generaluser.php), [included license](licenses/GeneralUser-GS-LICENSE.txt). Its license permits music creation and commercial musical recordings using the contained samples. The SoundFont is a build input and is not distributed with the game.
- SoundFont SHA-256 used for these renders: `9575028c7a1f589f5770fccc8cff2734566af40cd26ed836944e9a5152688cfe`.
- Synthesizer: **FluidSynth 2.6.1**, [official release](https://github.com/FluidSynth/fluidsynth/releases/tag/v2.6.1). The Windows x64 cpp11 release ZIP was checked against its published SHA-256: `fab7a2e4b85675b66970f97a39bbc239729c5e0f237198b5922a6a73cbc8677c`.
- Encoding/measurement: FFmpeg 7.1.1.
- The ImagineArt music service was attempted but required a subscription and produced no audio. None of these nine files comes from that service.

## Rebuild

Game playback and the ordinary build use committed MP3 files. They need neither a SoundFont nor an API subscription.

To recompose MIDI only:

```sh
npm run music:compose
```

To render, install FluidSynth and FFmpeg and download GeneralUser-GS.sf2 from the official repository. Set `FLUIDSYNTH`, `SOUNDFONT` and `FFMPEG` to their executable/input paths, then run:

```sh
npm run music:render
npm run audio:check
```

On Windows, the script also recognizes the ignored `.tools/soundtrack` toolchain directory and the locally installed `C:/ffmpeg-7.1.1-essentials_build/bin/ffmpeg.exe`. `.audio-work` contains temporary WAVs and is ignored by Git. Runtime files are described in `src/data/soundtrack.json`.
