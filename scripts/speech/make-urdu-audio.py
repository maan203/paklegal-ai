"""Generates Urdu incident recordings (Microsoft neural voices) to test speech-to-text.

    pip install edge-tts
    python scripts/speech/make-urdu-audio.py

Writes knowledge/eval/speech/*.mp3 and manifest.json. Synthetic voices are cleaner than real
recordings, so treat results as an upper bound and add real recordings when possible.
"""
import asyncio
import json
import pathlib

import edge_tts

OUT = pathlib.Path(__file__).resolve().parents[2] / "knowledge" / "eval" / "speech"
INCIDENTS = [
    ("ur-PK-AsadNeural", "robbery",
     "کل رات تقریباً گیارہ بجے میں اپنی دکان بند کر رہا تھا کہ دو لڑکے موٹر سائیکل پر آئے۔ ایک کے پاس پستول تھا۔ انہوں نے میرا موبائل فون اور پچیس ہزار روپے چھین لیے۔ میرے ہمسائے اسلم نے سب کچھ دیکھا۔"),
    ("ur-PK-UzmaNeural", "threat",
     "میرا سابقہ شوہر مجھے فون پر مسلسل دھمکیاں دے رہا ہے کہ وہ مجھے اور میرے بچوں کو نقصان پہنچائے گا۔ اس نے میری تصویریں فیس بک پر ڈالنے کی دھمکی بھی دی ہے۔ میرے پاس اس کے پیغامات کے اسکرین شاٹ موجود ہیں۔"),
    ("ur-PK-AsadNeural", "cheque",
     "میں نے اپنے دوست کو تین لاکھ روپے ادھار دیے تھے۔ اس نے مجھے چیک دیا لیکن بینک نے چیک واپس کر دیا کیونکہ اکاؤنٹ میں پیسے نہیں تھے۔ اب وہ میرا فون نہیں اٹھاتا۔"),
    ("ur-PK-UzmaNeural", "code_switch",
     "میں پولیس اسٹیشن گئی تاکہ FIR درج کرواؤں، لیکن ڈیوٹی آفیسر نے کہا کہ کل آنا۔ میری گاڑی گھر کے باہر سے چوری ہوئی ہے اور گلی میں CCTV کیمرہ بھی لگا ہوا ہے۔"),
]


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    for voice, name, text in INCIDENTS:
        path = OUT / f"{name}.mp3"
        await edge_tts.Communicate(text, voice).save(str(path))
        manifest.append({"name": name, "voice": voice, "file": path.name, "text": text})
        print(f"{name}: {path.stat().st_size // 1024} KB ({voice})")
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")


asyncio.run(main())
