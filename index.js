const Discord = require("discord.js")
const auth = require("./auth.json")
const Canvas = require("canvas")
const fs = require("fs")

var xp = {}
var timers = {}
var streamers = {}

var client = new Discord.Client();
var prefix = "r!"

const maxBar = 390;

function save(){
    fs.writeFileSync("xp.json", JSON.stringify(xp))
}


String.prototype.splitSpace = function(){
    var msgSplit = [];
    var currSplit = "";
    for(var i = 0; i < this.length; i++){
        if(this[i] == " " && i != 0){
            msgSplit.push(currSplit)
            currSplit = ""
        }
        if(this[i] != " "){
            currSplit += this[i]
        }
    }
    msgSplit.push(currSplit)
    return msgSplit
}

Object.prototype.containsKey = function(checkkey){
    return(Object.keys(this).some((key)=>{return(key==checkkey)}))
}
client.on("ready", ()=>{
    const load = JSON.parse(fs.readFileSync('xp.json'))
    client.guilds.cache.array().forEach((guild, i) => {
        var members = {}
        guild.members.cache.array().forEach((member, j) => {
            if(load.containsKey(guild.id) && load[guild.id].containsKey(member.user.id)){
                members[member.user.id] = parseInt(load[guild.id][member.user.id])
            }else{
                members[member.user.id] = 0
            }
        })
        xp[guild.id] = members
    })
    setInterval(()=>{
        Object.keys(streamers).forEach((userId, i) => {
            nonBotUsers = 0
            streamers[userId][1].members.forEach((member, i) =>{
                if(!member.user.bot && member.voice.speaking){
                    nonBotUsers += 1
                }
            })
            if(nonBotUsers > 1){
                streamers[userId] += 1
            }
        })
    }, 60000)
    console.log("Logged In")
})
client.on("voiceStateUpdate", (oldState, newState) => {
    if(!oldState.streaming && newState.streaming){
        streamers[newState.member.user.id] = [0, newState.channel]
    }
    if(oldState.streaming && !newState.streaming){
        xp[newState.guild.id][newState.member.user.id] += streamers[newState.member.user.id][0]*5
        delete streamers[newState.member.user.id]
    }
});
client.on("guildCreate", (guild) => {
    var members = guild.members.cache.array()
    var guildXP = {}
    for(var i = 0; i < members.length; i++){
        guildXP[members[i].user.id] = 0
    }
    xp[guild.id] = guildXP
})
client.on("guildMemberAdd", (member) => {
    if(!xp[member.guild.id].containsKey(member.user.id)){
        xp[member.guild.id][member.user.id] = 0
    }
})
client.on("guildDelete", (guild) => {
    delete xp[guild.id]
})
client.on("message", async (msg) =>{
    if(msg.author.bot){
        return;
    }
    if(!msg.guild){
        return;
    }
    const guild = msg.guild;
    const member = msg.member;
    const user = msg.author;
    const message = msg.content.toLowerCase();
    if(!timers.containsKey(guild.id)){
        timers[guild.id] = {}
        xp[guild.id][user.id] += Math.floor(Math.random()*7+18)
        timers[guild.id][user.id] = 0
        setTimeout(()=>{
            delete timers[guild.id][user.id]
        },30000)
    }
    if(!timers[guild.id].containsKey(user.id)){
        xp[guild.id][user.id] += Math.floor(Math.random()*7+18)
        timers[guild.id][user.id] = 0
        setTimeout(()=>{
            delete timers[guild.id][user.id]
        },30000)
    }
    if(message.startsWith(prefix)){
        const nonPrefix = message.substring(prefix.length)
        const msgSplit = nonPrefix.splitSpace();
        const command = msgSplit[0];
        const args = msgSplit.splice(1);
        switch (command){
            case "help":
                const helpEmbed = new Discord.MessageEmbed()
                helpEmbed.setTitle("Help")
                helpEmbed.addField("General Commands", "**r!rank** - displayes your rank \n **r!leaderboard** - displays everyone in a leaderboard formal")
                helpEmbed.addField("Admin Commands", "**r!clearAll** - clears all xp from every member of the server \n **r!clear** [member] - clears the member's xp \n **r!change** [member][amount] - adds the amount to the member's xp")
                helpEmbed.setFooter("sujayk#8847 and IshanR#7052 made this bot")
                msg.channel.send(helpEmbed)
                break
            case "rank":
                if(args.length != 0){
                    msg.reply("You put in too many args")
                    return;
                }
                const canvas = Canvas.createCanvas(576, 143);
                const ctx = canvas.getContext('2d');
                var level = 0;
                while(level*level*100 <= xp[guild.id][user.id]){
                    level+=1
                }
                var members = guild.members.cache.array()
                var membersXP = []
                for(var i = 0; i < guild.memberCount; i++){
                    var memberXP = xp[guild.id][members[i].user.id]
                    if(!members[i].user.bot){
                        membersXP.push(memberXP)
                    }
                }
                membersXP.sort((a, b) => {
                    if (a > b){
                        return a
                    }else{
                        return b
                    }
                })
                const rank = membersXP.indexOf(xp[guild.id][user.id]) + 1
                const totalbar = 100*(level*level - (level-1)*(level-1));
                // Since the image takes time to load, you should await it
                const background = await Canvas.loadImage('./EmptyXPBar.png');
                // This uses the canvas dimensions to stretch the image onto the entire canvas
                ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
                if(member.displayName.length > 16){
                    // Sets the font of the text
                    ctx.font = '10px sans-serif';
                }else{
                    // Sets the font of the text
                    ctx.font = '20px sans-serif';
                }
                // Select the style that will be used to fill the text in
                ctx.fillStyle = '#ffffff';
	            // Draw a rectangle with the dimensions of the entire canvas
                ctx.fillRect(canvas.width/4.2, canvas.height/1.63, maxBar*(xp[guild.id][user.id]-(level-1)*(level-1)*100)/totalbar, 36);
                // Actually fill the text with a solid color
                ctx.fillText(member.displayName, canvas.width / 4, canvas.height / 2);
                // Set new font
                ctx.font = '30px sans-serif';
                // Make more text 
                ctx.fillText('#' + rank.toString(), canvas.width / 1.75, canvas.height / 2)
                // Make more text
                ctx.fillText((level-1).toString(), canvas.width / 1.15, canvas.height / 4)
                // Change the font
                ctx.font = '20px sans-serif';
                // Make even more text
                ctx.fillText("Level", canvas.width / 1.3, canvas.height / 4)
                // Make MORE text
                ctx.fillText("Needed XP: "+(100*level*level-xp[guild.id][user.id]).toString(), canvas.width / 1.5, canvas.height / 1.9)
                // Wait for Canvas to load the image
                const avatar = await Canvas.loadImage(msg.author.displayAvatarURL({ format: 'png' }));
                // Draw a shape onto the main canvas
                ctx.drawImage(avatar, canvas.width/20, canvas.height/3.5, 70, 70);
                // Use helpful Attachment class structure to process the file for you
                const attachment = new Discord.MessageAttachment(canvas.toBuffer(), 'XPBar.png');
                msg.channel.send(attachment)
                break;
            case "leaderboard":
                const leaderboardEmbed = new Discord.MessageEmbed()
                
                var text = ""
                var members = guild.members.cache.array()
                var membersXP = []
                for(var i = 0; i < guild.memberCount; i++){
                    var memberXP = xp[guild.id][members[i].user.id]
                    if(!members[i].user.bot){
                        membersXP.push([members[i].displayName, memberXP])
                    }
                }
                membersXP.sort((a, b) => {
                    if (a[1] > b[1]){
                        return a
                    }else{
                        return b
                    }
                })
                for(var i = 0; i < membersXP.length; i++){
                    var level = 0;
                    while(level*level*100 <= membersXP[i][1]){
                        level+=1
                    }
                    text += "----------------------------------------------\n"
                    text += membersXP[i][0] + " has " + membersXP[i][1].toString() + " xp and is level " + (level - 1).toString() + "\n"
                    text += "----------------------------------------------\n"
                }
                leaderboardEmbed.setTitle("Leaderboard")
                leaderboardEmbed.setDescription(text)
                leaderboardEmbed.setFooter("sujayk#8847 and IshanR#7052 made this bot")
                msg.channel.send(leaderboardEmbed)
                break
            case "clearall":
                if(member.hasPermission("ADMINISTRATOR")){
                    Object.keys(xp[guild.id]).forEach((userId, i) => {
                        xp[guild.id][userId] = 0
                    })
                    msg.reply("The Rest Was Successfull")
                    break
                }
            case "clear":
                if(member.hasPermission("ADMINISTRATOR")){
                    var usersMention = msg.mentions.users
                    if(args.length < 1 && usersMention.size < 1){
                        msg.reply("You didn't specify who to reset")
                        return
                    }else if(usersMention.size > 0){
                        usersMention.forEach((u, key) => {
                            xp[guild.id][u.id] = 0
                        })
                    }else{
                        args.forEach((userString, i) => {
                            var tarMember = guild.members.cache.array().find((mem) => {return mem.displayName.toLowerCase() === userString.toLowerCase() || mem.user.username.toLowerCase() === userString.toLowerCase()})
                            if(tarMember == null){
                                msg.reply("Invalid argument at arg " + i.toString())
                                return
                            }
                            xp[guild.id][tarMember.user.id] = 0
                        })
                    }
                    msg.reply("The Rest Was Successfull")
                }
                break
            case "change":
                if(member.hasPermission("ADMINISTRATOR")){
                    var usersMention = msg.mentions.users
                    const change = parseInt(args[args.length - 1])
                    if(args.length < 2 && usersMention.size < 1){
                        msg.reply("Invalid args")
                    }else if(usersMention.size > 0){
                        usersMention.forEach((u, key) => {
                            xp[guild.id][u.id] += change
                        })
                    }else{
                        const members = args.slice(0, args.length - 1)
                        members.forEach((userString, i) => {
                            var tarMember = guild.members.cache.array().find((mem) => {return mem.displayName.toLowerCase() === userString.toLowerCase() || mem.user.username.toLowerCase() === userString.toLowerCase()})
                            if(tarMember == null){
                                msg.reply("Invalid argument at arg " + i.toString())
                                return
                            }
                            xp[guild.id][tarMember.user.id] += change
                        })
                    }
                    msg.reply("The Rest Was Successfull")
                }
        }
    }
    save()
})
client.login(auth.token)