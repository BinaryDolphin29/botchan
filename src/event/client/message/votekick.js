const { Message, MessageMentions: { USERS_PATTERN } } = require("discord.js")

module.exports = {
    usage: "b;votekick @MENTION REASON",
    examples: "b;votekick @MENTION REASON",
    description: "迷惑なユーザーをサーバーからキックするコマンドです。",

    /** @param {Message} message **/
    Do: message => {
        // RegExp.lastIndex 回避のため
        const PATTERN = new RegExp(USERS_PATTERN, "")
        const mentions = message.mentions.members
        const channel = message.channel
        let reason = "理由がありません！！"

        if (message.args.length >= 1) reason = message.args.slice(1).join(" ")
        if (mentions.size !== 1 || !PATTERN.test(message.args[0])) {
            channel.send("引数が無効です。\n\n例: b;votekick @MENTION REASON", global.syntax)
        } else {
            const member = mentions.first()
            if (!member.bannable) {
                channel.send("このユーザーはBANできません・・・", global.syntax)
                return
            }

            const voteMessage = channel.send({
                embed: {
                    color: 0xFF0000,
                    title: "このユーザーをキックしますか？",
                    fields: [{
                        name: "対象ユーザー",
                        value: `${member.displayName}#${member.user.discriminator}`,
                        inline: true
                    },
                    {
                        name: "理由",
                        value: reason,
                        inline: true
                    }],
                    thumbnail: {
                        url: member.user.displayAvatarURL
                    },
                    timestamp: new Date()
                }
            })
        }
    }
}

// b;votekick @MENTION REASON
// index:        0       1