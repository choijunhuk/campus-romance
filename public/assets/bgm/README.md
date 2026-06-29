# BGM tracks

Drop looping `.mp3` files here. The engine picks a track from each scene's
`bgm_mood` via `bgmTrack()` (see `src/engine/atmosphere.ts`). Needed files:

| file | used for moods |
|------|----------------|
| `day.mp3` | default / `*_afternoon` |
| `evening.mp3` | `evening_*`, `*_wind`, sunset/dusk |
| `night.mp3` | `*_night`, `night_*` |
| `tense.mp3` | `tense_*` |

Missing files degrade silently (no audio, no error). Volume + mute are in the
in-game Settings panel.
