import requests
import json
import os
from discord_webhook import DiscordWebhook, DiscordEmbed

if os.environ.get("GITHUB_REF") != "refs/heads/main":
    exit()

LIVERY_UPDATE_WEBHOOK = os.environ["LIVERY_UPDATE_WEBHOOK"]

with open(".webhook/commit.txt", "r") as file:
    commit_id = file.read().strip()

new_raw = requests.get(
    "https://raw.githubusercontent.com/CCA131488/GeoFS-liveries/refs/heads/main/livery.json"
).text

old_raw = requests.get(
    f"https://raw.githubusercontent.com/CCA131488/GeoFS-liveries/{commit_id}/livery.json"
).text

if new_raw == old_raw:
    exit()

new_json = json.loads(new_raw)
old_json = json.loads(old_raw)

diff_data = []
total = 0

# ===== diff =====
for plane_id, plane_data in new_json["aircrafts"].items():

    old_liveries = old_json.get("aircrafts", {}).get(plane_id, {}).get("liveries", [])
    new_liveries = plane_data.get("liveries", [])

    plane_name = plane_data.get("name", plane_id)

    for livery in new_liveries:
        if livery not in old_liveries:
            diff_data.append((plane_name, livery))

if not diff_data:
    exit()

# ===== ① Title embed =====
title_webhook = DiscordWebhook(url=LIVERY_UPDATE_WEBHOOK)
title_embed = DiscordEmbed(
    description="# Livery update",
    color="242429"
)
title_webhook.add_embed(title_embed)
title_webhook.execute()

# ===== ② Each livery embed =====
for plane_name, livery in diff_data:

    total += 1

    livery_name = livery.get("name", "Unknown")
    credits = livery.get("credits", "??")

    type_id = livery.get("type_id", 2)
    livery_type = "real livery" if type_id == 1 else "virtual livery"

    embed = DiscordEmbed(
        description=(
            f"**{plane_name}**\n"
            f"**{livery_type}**\n"
            f"{livery_name} *by: {credits}*"
        ),
        color="242429"
    )

    webhook = DiscordWebhook(url=LIVERY_UPDATE_WEBHOOK)
    webhook.add_embed(embed)
    webhook.execute()

# ===== ③ Total embed =====
number_emojis = {
    "0": ":zero:",
    "1": ":one:",
    "2": ":two:",
    "3": ":three:",
    "4": ":four:",
    "5": ":five:",
    "6": ":six:",
    "7": ":seven:",
    "8": ":eight:",
    "9": ":nine:"
}

def number_to_emoji(num):
    return "".join(number_emojis[d] for d in str(num))

total_webhook = DiscordWebhook(url=LIVERY_UPDATE_WEBHOOK)
total_embed = DiscordEmbed(
    description=f"Total: {number_to_emoji(total)}",
    color="242429"
)
total_webhook.add_embed(total_embed)
total_webhook.execute()
