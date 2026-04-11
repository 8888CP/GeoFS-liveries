import requests
import os
from datetime import datetime
from discord_webhook import DiscordWebhook, DiscordEmbed

WEBHOOK_URL = os.environ["LIVERY_UPDATE_WEBHOOK"]

# 读取 commit
with open(".webhook/commit.txt", "r") as file:
    commit_id = file.read().strip()

# 获取 JSON
new_json = requests.get(
    "https://raw.githubusercontent.com/CCA131488/GeoFS-liveries/main/livery.json"
).json()

old_json = requests.get(
    f"https://raw.githubusercontent.com/CCA131488/GeoFS-liveries/{commit_id}/livery.json"
).json()

diff_data = []

# 🔍 diff 检测
for plane_key, plane_data in new_json["aircrafts"].items():
    new_liveries = plane_data["liveries"]

    try:
        old_liveries = old_json["aircrafts"][plane_key]["liveries"]
    except KeyError:
        old_liveries = []

    addition = []

    for livery in new_liveries:
        if livery not in old_liveries:
            addition.append(livery)

    if addition:
        diff_data.append({
            "name": plane_data.get("name", plane_key),
            "addition": addition
        })

# 🚀 有更新才发送
if diff_data:
    total = 0

    # 🕒 时间（统一）
    update_time = datetime.now().strftime("%B %d, %Y at %I:%M %p")

    # ✈️ 每个机型 → 单独消息
    for plane in diff_data:
        webhook = DiscordWebhook(url=WEBHOOK_URL)

        webhook.content = (
            f"**livery updates**\n"
            f"Update time: {update_time}\n"
            f"Update by: <@1396820811876405278>"
        )

        real_lines = []
        virtual_lines = []

        for livery in plane["addition"]:
            total += 1

            name = livery.get("name", "Unknown")
            creator = livery.get("credits", "CP8888")
            type_id = livery.get("type_id", 1)

            line = f"{name} by: {creator}"

            if type_id == 1:
                real_lines.append(line)
            else:
                virtual_lines.append(line)

        embed = DiscordEmbed(
            title=plane["name"],
            color="2b2d31"
        )

        if real_lines:
            embed.add_embed_field(
                name="real liveries",
                value="\n".join(real_lines),
                inline=False
            )

        if virtual_lines:
            embed.add_embed_field(
                name="virtual liveries",
                value="\n".join(virtual_lines),
                inline=False
            )

        webhook.add_embed(embed)
        webhook.execute()

    # 📊 Total 单独一条消息
    webhook = DiscordWebhook(url=WEBHOOK_URL)

    webhook.content = (
        f"**livery updates**\n"
        f"Update time: {update_time}\n"
        f"Update by: <@1396820811876405278>"
    )

    total_embed = DiscordEmbed(
        description=f"**Total: {total}**",
        color="5865F2"
    )

    webhook.add_embed(total_embed)
    webhook.execute()
