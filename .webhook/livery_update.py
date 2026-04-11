import requests
import json
import os
from discord_webhook import DiscordWebhook, DiscordEmbed

LIVERY_UPDATE_WEBHOOK = os.environ["LIVERY_UPDATE_WEBHOOK"]

with open(".webhook/commit.txt", "r") as file:
    commit_id = file.read().strip()

# 当前最新数据
new_json = json.loads(
    requests.get(
        "https://raw.githubusercontent.com/CCA131488/GeoFS-liveries/refs/heads/main/livery.json"
    ).text
)

# 旧数据（对比用）
old_json = json.loads(
    requests.get(
        f"https://raw.githubusercontent.com/CCA131488/GeoFS-liveries/{commit_id}/livery.json"
    ).text
)

diff_data = []
total = 0

for plane_id, plane_data in new_json["aircrafts"].items():
    addition = []

    new_liveries = plane_data.get("liveries", [])
    old_liveries = old_json.get("aircrafts", {}).get(plane_id, {}).get("liveries", [])

    for livery in new_liveries:
        if livery not in old_liveries:
            addition.append(livery)

    if addition:
        diff_data.append({
            "plane_name": plane_data.get("name", plane_id),
            "liveries": addition
        })

# ✈️ 每个飞机一个消息
for plane in diff_data:
    webhook = DiscordWebhook(url=LIVERY_UPDATE_WEBHOOK)

    text = ""

    for livery in plane["liveries"]:
        total += 1
        name = livery.get("name", "Unknown")
        credits = livery.get("credits", "??")
        text += f"{name} by: {credits}\n"

    embed = DiscordEmbed(
        description=f"{plane['plane_name']}\n{text.strip()}",
        color="242429"
    )

    webhook.add_embed(embed)
    webhook.execute()

# 📊 Total 单独消息
webhook = DiscordWebhook(url=LIVERY_UPDATE_WEBHOOK)

embed = DiscordEmbed(
    description=f"Total: {total}",
    color="242429"
)

webhook.add_embed(embed)
webhook.execute()
