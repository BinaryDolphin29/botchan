const description = 
`このコマンドは、一定時間内に一定数のyes投票でkickすることが出来ます。

このコマンドを実行するための条件
    ・ サーバーに参加してから1年以上のユーザー
    ・ botがkickできるユーザー
    ・ 他の投票を受け付けていない時
    
管理者
  ・ :ng: をリアクションすると投票を削除できる`


const { Message, ReactionCollector, MessageMentions: { USERS_PATTERN } } = require("discord.js")
const aYearAgo = () => Date.now() - 31536000000
const getReason = args => args.length >= 1 ? args.slice(1).join(" ") : ""
const voteEmojis = ["🆗", "🆖"]
let inProgress = false

module.exports = {
    usage: "b;votekick @MENTION REASON",
    examples: "b;votekick @MENTION REASON",
    description: "迷惑なユーザーをサーバーからkickします。",

    /** @param {Message} message **/
    Do: async message => {
        const channel = message.channel

        if (!message.args.length) return channel.send(`${description}\n\n参加してから ${Math.trunc((Date.now() - message.member.joinedTimestamp) / 86400000)}日目`, global.syntax)
        if (inProgress || message.member.joinedTimestamp > aYearAgo()) return

        // RegExp.lastIndex 回避のため
        const PATTERN = new RegExp(USERS_PATTERN, "")
        
        const mentions = message.mentions.members
        const reason = getReason()

        if (mentions.size !== 1 || !PATTERN.test(message.args[0]) || reason.length <= 10) {
            channel.send("引数が無効です。\n\n例: b;votekick @MENTION REASON(length <= 10)", global.syntax)
        } else {
            const member = mentions.first()
            if (!member.kickable || member === message.member) {
                channel.send("このユーザーはkickできません・・・", global.syntax)
                return
            }

            // offline, idle, botを除くギルドユーザーの10%, 5人に満たないサーバーは2人に設定
            const voters = Math.round(message.guild.members.filter(m => !m.user.bot || !["offline", "idle"].includes(m.presence.status)).size * 0.1) || 2
            const voteMessage = await channel.send("@here", {
                embed: {
                    color: 0xFF0000,
                    title: "このユーザーを***kick***しますか？",
                    description: `この投票は${voters*2}分以内に、${voters}人以上の投票でkickすることができます。\nなお、***一度投票すると変更することは出来ません。***`,
                    fields: [{
                        name: "対象ユーザー",
                        value: `**${member.displayName}**#${member.user.discriminator}`,
                    },
                    {
                        name: "理由",
                        value: reason,
                    }],
                    thumbnail: {
                        url: member.user.displayAvatarURL
                    },
                    timestamp: new Date(),
                    footer: {
                        text: "kickしますか？"
                    }
                },
            })

            await voteMessage.pin()
            await voteMessage.react(voteEmojis[0])
            inProgress = true

            const vList = new Set()
            /** @type {ReactionCollector} */
            const collector = voteMessage.createReactionCollector((reaction, user) => {
                const filter = voteEmojis.includes(reaction.emoji.name) && user.id !== member.user.id && !vList.has(user.id) && !user.bot
                if (user.id !== message.client.user.id) vList.add(user.id)

                return filter
            }, { time: (1000 * 60) * (voters * 2) })

            let count = 0
            collector.on("collect", async r => {
                if (r.emoji.name === voteEmojis[1] && message.member.hasPermission("ADMINISTRATOR")) {
                    collector.stop("cancel")
                    return
                }

                count++
                if (voters <= count) {
                    try {
                        collector.stop("vote")
                        await member.kick(reason)
                        channel.send("kickしました。", global.syntax)
                    } catch (e) {
                        channel.send(`kickできませんでした。\n\n${e.message}`, global.syntax)
                    }
                }
            })
            
            collector.on("end", async (_, _reason) => {
                inProgress = false
                if (_reason === "cancel") return voteMessage.delete()
                if (_reason === "vote") return

                channel.send("投票人数が一定数を超えなかったため、kickできませんでした。", global.syntax)
                voteMessage.clearReactions()
                voteMessage.unpin()
            })
        }
    }
}

// b;votekick @MENTION REASON
// index:        0       1