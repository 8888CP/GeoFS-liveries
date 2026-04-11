import requests
import os
from discord_webhook import DiscordWebhook, DiscordEmbed

WEBHOOK = os.environ["LIVERY_UPDATE_WEBHOOK"]

with open(".webhook/commit.txt", "r") as f:
    commit_id = f.read().strip()

BASE = "https://raw.githubusercontent.com/CCA131488/GeoFS-liveries"

# ✅ 正确 JSON 获取方式（防 BOM / content 错误）
new_json = requests.get(f"{BASE}/refs/heads/main/livery.json").json()
old_json = requests.get(f"{BASE}/{commit_id}/livery.json").json()

diff_data = []

# 🔍 diff
for plane_id, plane_data in new_json["aircrafts"].items():

    addition = []

    new_liveries = plane_data.get("liveries", [])
    old_liveries = old_json.get("aircrafts", {}).get(plane_id, {}).get("liveries", [])

    for livery in new_liveries:
        if livery not in old_liveries:
            addition.append(livery)

    if addition:
        diff_data.append({
            "name": plane_data.get("name", plane_id),
            "addition": addition
        })

total = 0

if diff_data:

    # ✈️ 每个飞机 = 单独消息
    for plane in diff_data:

        webhook = DiscordWebhook(url=WEBHOOK)

        text = ""

        for livery in plane["addition"]:
            total += 1
            name = livery.get("name", "unknown")
            credits = livery.get("credits", "??")

            text += f"{name} by: *{credits}*\n"

        embed = DiscordEmbed(
            title=plane["name"],
            description=text.strip(),
            color="242429"
        )

        webhook.add_embed(embed)
        webhook.execute()

    # 📊 total message
    webhook = DiscordWebhook(url=WEBHOOK)

    embed = DiscordEmbed(
        title="Total",
        description=str(total),
        color="242429"
    )

    webhook.add_embed(embed)
    webhook.execute()
