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

if not diff_data:
    exit()

first = True

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

    if first:
        embed.set_title("Livery Update!")
        first = False

    webhook.add_embed(embed)
    webhook.execute()

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

webhook = DiscordWebhook(url=LIVERY_UPDATE_WEBHOOK)

embed = DiscordEmbed(
    description=f"Total: {number_to_emoji(total)}",
    color="242429"
)

webhook.add_embed(embed)
webhook.execute()
