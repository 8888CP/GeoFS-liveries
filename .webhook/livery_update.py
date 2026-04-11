import requests
import json
import os
from discord_webhook import DiscordWebhook, DiscordEmbed

LIVERY_UPDATE_WEBHOOK = os.environ["LIVERY_UPDATE_WEBHOOK"]

# 读取 commit id
with open(".webhook/commit.txt", "r") as file:
    commit_id = file.read().strip()
    print("commit:", commit_id)


BASE_URL = "https://raw.githubusercontent.com/CCA131488/GeoFS-liveries"


def get_json(url):
    """安全获取 JSON"""
    try:
        return requests.get(url, timeout=20).json()
    except Exception as e:
        print(f"Failed to fetch JSON: {url}")
        raise e


# ✅ 正确获取 JSON（关键修复点）
new_json = get_json(
    f"{BASE_URL}/refs/heads/main/livery.json"
)

old_json = get_json(
    f"{BASE_URL}/{commit_id}/livery.json"
)

keys = new_json["aircrafts"].keys()

diff_data = []

# 🛠 diff 计算
for plane in keys:
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

print("diff:", diff_data)

total = 0

# emoji map
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

# 🚀 发送 webhook
if diff_data:

    for plane in diff_data:
        webhook = DiscordWebhook(url=LIVERY_UPDATE_WEBHOOK)

        embed = DiscordEmbed(
            title="livery update",
            color="242429"
        )

        livery_list = ""

        for livery in plane["addition"]:
            total += 1

            name = livery.get("name", "unknown")
            credits = livery.get("credits", "??")

            livery_list += f"{name} *by: {credits}*\n"

        embed.add_embed_field(
            name=plane["name"],
            value=livery_list.strip() if livery_list else "None",
            inline=False
        )

        webhook.add_embed(embed)
        webhook.execute()

    # 📊 total embed
    webhook = DiscordWebhook(url=LIVERY_UPDATE_WEBHOOK)

    total_display = number_map.get(total, str(total))

    embed = DiscordEmbed(
        title="livery update",
        description=f"**Total: {total_display}**",
        color="242429"
    )

    webhook.add_embed(embed)
    webhook.execute()
