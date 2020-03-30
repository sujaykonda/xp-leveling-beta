const Discord = require("discord.js")
const auth = require("./auth.json")
const Canvas = require("canvas")
const fs = require("fs")

var xp = {}
var timers = {}
var streamers = {}

var client = new Discord.Client();
var prefix = "r!"

const maxBar = 356;

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
            if(load.containsKey(guild.id) && load[guild.id].containsKey(member.id)){
                members[member.id] = load[guild.id][member.id]
            }else{
                members[member.id] = 0
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
        console.log(streamers[newState.member.user.id][0])
        xp[newState.guild.id][newState.member.id] += streamers[newState.member.user.id][0]*5
        delete streamers[newState.member.user.id]
    }
});
client.on("guildCreate", (guild) => {
    var members = guild.members.cache.array()
    var guildXP = {}
    for(var i = 0; i < members.length; i++){
        guildXP[members[i].id] = 0
    }
    xp[guild.id] = guildXP
})
client.on("guildMemberAdd", (member) => {
    xp[member.guild.id][member.id] = 0
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
    const message = msg.content.toLowerCase();
    if(!timers.containsKey(guild.id)){
        timers[guild.id] = {}
        xp[guild.id][member.id] += Math.floor(Math.random()*7+18)
        timers[guild.id][member.id] = 0
        setTimeout(()=>{
            delete timers[guild.id][member.id]
        },30000)
    }
    if(!timers[guild.id].containsKey(member.id)){
        xp[guild.id][member.id] += Math.floor(Math.random()*7+18)
        timers[guild.id][member.id] = 0
        setTimeout(()=>{
            delete timers[guild.id][member.id]
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
                helpEmbed.setDescription("do r!rank to see the xp and how close you are to the next level")
                helpEmbed.setFooter("sujayk#8847 and IshanR#7052 made this bot")
                msg.channel.send(helpEmbed)
                break
            case "rank":
                if(args.length != 0){
                    msg.reply("You put in too many args")
                    return;
                }
                const canvas = Canvas.createCanvas(500, 500);
                const ctx = canvas.getContext('2d');
                var level = 0;
                while(level*level*100 < xp[guild.id][member.id]){
                    level+=1
                }
                const totalbar = 100*(level*level - (level-1)*(level-1));
                // Since the image takes time to load, you should await it
                const background = await Canvas.loadImage('./EmptyXPBar.png');
                // This uses the canvas dimensions to stretch the image onto the entire canvas
                ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
                // Sets the font of the text
                ctx.font = '30px sans-serif';
                // Select the style that will be used to fill the text in
                ctx.fillStyle = '#ffffff';
	            // Draw a rectangle with the dimensions of the entire canvas
                ctx.fillRect(canvas.width/6, canvas.height/1.68, maxBar*(xp[guild.id][member.id]-(level-1)*(level-1)*100)/totalbar, 51);
                // Actually fill the text with a solid color
                ctx.fillText(member.displayName, canvas.width / 3, canvas.height / 2);
                // Make more text
                ctx.fillText((level-1).toString(), canvas.width / 1.3, canvas.height / 2.2)
                // Change the font
                ctx.font = '20px sans-serif';
                // Make even more text
                ctx.fillText("Level", canvas.width / 1.5, canvas.height / 2.21)
                // Make MORE text
                ctx.fillText("Needed XP: "+(100*level*level-xp[guild.id][member.id]).toString(), canvas.width / 1.8, canvas.height / 1.9)
                // Wait for Canvas to load the image
                const avatar = await Canvas.loadImage(msg.author.displayAvatarURL({ format: 'png' }));
                // Draw a shape onto the main canvas
                ctx.drawImage(avatar, canvas.width/6, canvas.height/2.5, 70, 70);
                // Use helpful Attachment class structure to process the file for you
                const attachment = new Discord.MessageAttachment(canvas.toBuffer(), 'XPBar.png');
                msg.channel.send(attachment)
                break
            case "leaderboard":
                const leaderboardEmbed = new Discord.MessageEmbed()
                
                var text = ""
                var members = guild.members.cache.array()
                var membersXP = []
                for(var i = 0; i < guild.memberCount; i++){
                    var memberXP = xp[guild.id][members[i].id]
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
                    text += "----------------------------------------------\n"
                    text += membersXP[i][0] + " has " + membersXP[i][1].toString() + " xp \n"
                    text += "----------------------------------------------\n"
                }
                leaderboardEmbed.setTitle("Leaderboard")
                leaderboardEmbed.setDescription(text)
                leaderboardEmbed.setFooter("sujayk#8847 and IshanR#7052 made this bot")
                msg.channel.send(leaderboardEmbed)
                break
        }
    }
    save()
})
client.login(auth.token)