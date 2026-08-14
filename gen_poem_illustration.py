# -*- coding: utf-8 -*-
import json, base64, urllib.request, sys

PROMPT = """Generate one standalone 16:9 horizontal Chinese article illustration.

Visual DNA:
Pure white background. Minimalist black hand-drawn line art. Slightly wobbly pen lines. Lots of empty white space. Sparse red/orange/blue handwritten Chinese annotations. Clean absurd product-sketch feeling. No gradients, no shadows, no paper texture, no complex background, no commercial vector style, no PPT infographic look, no cute mascot poster, no children's illustration, no realistic UI.

Recurring IP character required:
小黑, a small solid-black absurd creature with white dot eyes, tiny thin legs, blank serious expression, slightly uneven hand-drawn body shape. 小黑 must perform the core conceptual action, not decorate the scene. Make 小黑 serious, deadpan, and slightly bizarre, not cute.

Theme:
春日偶成——春风、垂柳、桃花、燕子、闲云构成的春日小景。

Structure type:
概念隐喻

Core idea:
春天到来、万物复苏：由近处春风与垂柳，到水边桃花，再到远处燕子与闲云，春意由近及远地流动展开。

Composition:
画面左下方，小黑严肃地举起双手，托起一缕盘旋上升的春风（橙色箭头曲线），春风牵引垂下的柳条随之摆动；中部偏右，一树桃花临水绽放，水面用一两笔淡线暗示倒影；右上方，一只燕子斜穿而过，太阳旁飘着几朵闲云。视线从左下到右上流动，保留大量留白。

Suggested elements:
垂柳枝条 / 一树桃花映水 / 斜飞的燕子 / 太阳旁的闲云

Chinese handwritten labels:
春风 / 柳 / 桃 / 燕 / 闲云

Color use:
Black for main line art and 小黑. Orange for main flow/path/arrows (春风曲线). Red only for key warnings/problems/results (桃花用红色点缀). Blue only for secondary notes or feedback/system state (闲云、燕子用蓝色小字标注).

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

out = "/Users/ully/githubprojects/ds-plugin-store/poem-illustration.png"
with open(out, "wb") as f:
    f.write(base64.b64decode(b64))
print("SAVED", out, "bytes", len(base64.b64decode(b64)))
