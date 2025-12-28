import sys
from TTS.api import TTS

# Usage:
# python xtts_generate.py reference.wav "text" "en" out.wav

ref_wav = sys.argv[1]
text = sys.argv[2]
lang = sys.argv[3]
out_path = sys.argv[4]

tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")

tts.tts_to_file(
    text=text,
    speaker_wav=ref_wav,
    language=lang,
    file_path=out_path
)

print(out_path)
