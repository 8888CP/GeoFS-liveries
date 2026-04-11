import requests
import json
import os
from discord_webhook import DiscordWebhook, DiscordEmbed

LIVERY_UPDATE_WEBHOOK = os.environ["LIVERY_UPDATE_WEBHOOK"]

with open(".webhook/commit.txt", "r") as file:
    commit_id = file.read()
    print(commit_id)

new_json = json.loads(
    requests.get(
        "https://raw.githubusercontent.com/CCA131488/GeoFS-liveries/refs/heads/main/livery.json"
    ).content
)

old_json = json.loads(
    requests.get(
        f"https://raw.githubusercontent.com/CCA131488/GeoFS-liveries/{commit_id}/livery.json"
    ).content
)

keys = new_json["aircrafts"].keys()

diff_data = []

for plane in keys:
    addition = []

    for livery in new_json["aircrafts"][plane]["liveries"]:
        try:
            if livery not in old_json["aircrafts"][plane]["liveries"]:
                addition.append(livery)
        except KeyError:
            addition.append(livery)

    try:
        data = {
            "name": new_json["aircrafts"][plane]["name"],
            "addition": addition
        }
    except KeyError:
        data = {
            "name": plane,
            "addition": addition
        }

    if addition:
        diff_data.append(data)

print(diff_data)

total = 0

# 🎯 emoji map（0-10）
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

    # ✈️ 每个机型一个 embed（一个消息）
    for plane in diff_data:
        webhook = DiscordWebhook(url=LIVERY_UPDATE_WEBHOOK)

        embed = DiscordEmbed(
            title="livery update",
            color="242429"
        )

        livery_list = ""

        for livery in plane["addition"]:
            total += 1

            try:
                livery_list += f'{livery["name"]} *by: {livery["credits"]}*\n'
            except KeyError:
                livery_list += f'{livery["name"]} *by: ??*\n'

        embed.add_embed_field(
            name=plane["name"],
            value=livery_list.strip(),
            inline=False
        )

        webhook.add_embed(embed)
        webhook.execute()

    # 📊 Total 单独一个 embed
    webhook = DiscordWebhook(url=LIVERY_UPDATE_WEBHOOK)

    total_display = number_map.get(total, str(total))

    embed = DiscordEmbed(
        title="livery update",
        description=f"**Total: {total_display}**",
        color="242429"
    )

    webhook.add_embed(embed)
    webhook.execute()
