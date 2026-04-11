import requests
import json
import os
from discord_webhook import DiscordWebhook, DiscordEmbed

LIVERY_UPDATE_WEBHOOK = os.environ["LIVERY_UPDATE_WEBHOOK"]

with open(".webhook/commit.txt", "r") as file:
    commit_id = file.read().strip()

BASE_URL = "https://raw.githubusercontent.com/CCA131488/GeoFS-liveries"

new_json = requests.get(f"{BASE_URL}/refs/heads/main/livery.json").json()
old_json = requests.get(f"{BASE_URL}/{commit_id}/livery.json").json()

diff_data = []

for plane in new_json["aircrafts"]:
    addition = []

    new_liveries = new_json["aircrafts"].get(plane, {}).get("liveries", [])
    old_liveries = old_json["aircrafts"].get(plane, {}).get("liveries", [])

    for livery in new_liveries:
        if livery not in old_liveries:
            addition.append(livery)

    if addition:
        diff_data.append({
            "name": new_json["aircrafts"][plane].get("name", plane),
            "addition": addition
        })

total = 0

number_map = {
    0: ":zero:",
    1: ":one:",
    2: ":two:",
    3: ":three:",
    4: ":four:",
    5: ":five:",
    6: ":six:",
    7: ":seven:",
    8: ":eight:",
    9: ":nine:",
    10: ":ten:"
}

if diff_data:

    webhook = DiscordWebhook(url=LIVERY_UPDATE_WEBHOOK)

    # 🔥 头部总标题（只出现一次）
    header = DiscordEmbed(
        description="**【#Livery update#】**",
        color="242429"
    )
    webhook.add_embed(header)

    # ✈️ 每个飞机一个 embed（无 title）
    for plane in diff_data:

        livery_text = ""

        for livery in plane["addition"]:
            total += 1
            name = livery.get("name", "unknown")
            credits = livery.get("credits", "??")

            livery_text += f"{name} by: *{credits}*\n"

        embed = DiscordEmbed(
            description=f"**【{plane['name']}】**\n{livery_text.strip()}",
            color="242429"
        )

        webhook.add_embed(embed)

    # 📊 total 单独 embed
    total_embed = DiscordEmbed(
        description=f"**【Total: {number_map.get(total, str(total))}】**",
        color="242429"
    )

    webhook.add_embed(total_embed)

    webhook.execute()
