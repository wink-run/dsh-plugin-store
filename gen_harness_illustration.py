# -*- coding: utf-8 -*-
import json, base64, urllib.request, sys

PROMPT = """Generate one standalone 16:9 horizontal Chinese article illustration.

Visual DNA:
Pure white background. Minimalist black hand-drawn line art. Slightly wobbly pen lines. Lots of empty white space. Sparse red/orange/blue handwritten Chinese annotations. Clean absurd product-sketch feeling. No gradients, no shadows, no paper texture, no complex background, no commercial vector style, no PPT infographic look, no cute mascot poster, no children's illustration, no realistic UI.

Recurring IP character required:
小黑, a small solid-black absurd creature with white dot eyes, tiny thin legs, blank serious expression, slightly uneven hand-drawn body shape. 小黑 must perform the core conceptual action, not decorate the scene. Make 小黑 serious, deadpan, and slightly bizarre, not cute.

Theme:
咏 DeepSeek-Harness——开源智能编排平台：灵台一脉，插件如星，万象编排，深寻智海。

Structure type:
概念隐喻

Core idea:
deepseek-harness 像一座灵台中枢，把万千插件像星辰一样编排、串连成一张星网，自中枢出发深入智海、连通广宇、开启千门。

Composition:
画面中央偏下，小黑严肃地站着，双手向上牵出数条橙色曲线，把上方散落的几颗「插件星辰」一颗颗串连成一幅星座/星网（形似北斗的折线）；小黑脚下是几笔淡线波浪，代表「智海」（深寻）；画面右上方，星空深处立着一扇微微开启的门，旁飘几朵云。视线从中央枢纽向四周与上方流动，保留大量留白。

Suggested elements:
灵台中枢（小黑脚下的小台座） / 插件星辰与橙色连线星网 / 智海波浪 / 广宇星空与微启之门

Chinese handwritten labels:
灵台 / 插件 / 编排 / 智海 / 广宇

Color use:
Black for main line art and 小黑. Orange for main flow/path/arrows (插件连线的星网). Red only for key warnings/problems/results (微启之门用红色小字标注). Blue only for secondary notes or feedback/system state (智海、广宇用蓝色小字标注).

Constraints:
One image explains only one core structure. Keep the main subject around 40%-60% of the canvas. Preserve at least 35% blank white space. Use at most 5-8 short handwritten Chinese labels. Do not write a title in the top-left corner. Do not write the structure type on the image. Do not make it a formal diagram, course slide, or dense explainer. Do not copy prior examples or reuse known case compositions unless explicitly requested; invent a fresh visual metaphor for this specific article. It should be clear but not instructional, interesting but not childish, strange but clean."""

payload = {
    "model": "gpt-image-2",
    "prompt": PROMPT,
    "n": 1,
    "size": "1536x1024",
}

req = urllib.request.Request(
    "http://127.0.0.1:11430/v1/images/generations",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"},
)
try:
    resp = urllib.request.urlopen(req, timeout=300)
except urllib.error.HTTPError as e:
    print("HTTP", e.code, e.read().decode("utf-8", "replace"))
    sys.exit(1)

body = json.loads(resp.read().decode("utf-8"))
b64 = body["data"][0].get("b64_json")
if not b64:
    print("NO b64_json; body keys:", list(body.keys()))
    print(json.dumps(body, ensure_ascii=False)[:2000])
    sys.exit(1)

raw = base64.b64decode(b64)
out = "/Users/ully/githubprojects/ds-plugin-store/harness-illustration.png"
with open(out, "wb") as f:
    f.write(raw)
print("SAVED", out, "bytes", len(raw))
