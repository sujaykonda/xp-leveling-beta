//constants
const Discord = require("discord.js");
const colorString = require("color-string");
const pug = require("pug");
const token = process.env.TOKEN;
const Canvas = require("canvas");
const fs = require("fs");
const http = require("http");
const url = require("url");
const express = require("express");
const app = express();

//dictionaries for local things
var xp = {};
var timers = {};
var streamers = {};
var style = {};
var prefixes = {};
var miniEventChannel = {};
var roles = {};
//client
var client = new Discord.Client();
//Used for Canvas. We use it for the maximum length of the bar.
const maxBar = 400;

var PopUpEventOn = false;
var miniEventXp = 0;

const webUrl = `http://${process.env.PROJECT_DOMAIN}.glitch.me/`;

//functions for saving things to json files
function save() {
  fs.writeFileSync("xp.json", JSON.stringify(xp));
}
function saveStyle() {
  fs.writeFileSync("style.json", JSON.stringify(style));
}
function savePrefixes() {
  fs.writeFileSync("prefixes.json", JSON.stringify(prefixes));
}
function saveChannels() {
  fs.writeFileSync("miniEventChannels.json", JSON.stringify(miniEventChannel));
}
function saveRoles() {
  fs.writeFileSync("roles.json", JSON.stringify(roles));
}
// This is for the mini events
function startMiniEvent() {
  Object.keys(miniEventChannel).forEach(guildId => {
    var nonAfk = 0;
    const guild = client.guilds.cache.get(guildId);
    guild.members.cache.each(member => {
      const lastMessage = member.lastMessage;
      if (
        lastMessage &&
        Date.now() - lastMessage.createdAt.getTime() < 600000 &&
        !member.user.bot
      ) {
        nonAfk += 1;
      }
    });
    if (nonAfk >= 1 && Math.random() > 0.96) {
      miniEventXp = Math.round(Math.random() * 50 + 75);
      guild.channels.cache
        .get(miniEventChannel[guildId])
        .send(
          "First Person To Type hello below wins " +
            miniEventXp.toString() +
            " xp"
        );
      PopUpEventOn = true;
    }
  });
}
// This function addes xp to a certian user
function addXP(guildId, userId, amount) {
  xp[guildId][userId][0] += amount;
  var level = xp[guildId][userId][1];
  if (amount < 0) {
    while (level * level * 100 >= xp[guildId][userId][0]) {
      level -= 1;
    }
  } else {
    while ((level + 1) * (level + 1) * 100 <= xp[guildId][userId][0]) {
      level += 1;
    }
  }
  xp[guildId][userId][1] = level;
}
// This checks and adds all roles that he deserves
function addRoles(guild, member) {
  for (var i = 0; i < 4; i++) {
    if (
      roles[guild.id][i][1] != -1 &&
      xp[guild.id][member.user.id][1] >= roles[guild.id][i][0]
    ) {
      member.roles.add(guild.roles.cache.get(roles[guild.id][i][1]));
    }
  }
}
//function to split spaces
String.prototype.splitSpace = function() {
  var msgSplit = [];
  var currSplit = "";
  for (var i = 0; i < this.length; i++) {
    if (this[i] == " " && i != 0) {
      msgSplit.push(currSplit);
      currSplit = "";
    }
    if (this[i] != " ") {
      currSplit += this[i];
    }
  }
  msgSplit.push(currSplit);
  return msgSplit;
};
//checks if the dictionary contains the key
Object.prototype.containsKey = function(checkkey) {
  return Object.keys(this).some(key => {
    return key == checkkey;
  });
};

// Website code
console.log("Starting server");
app.set("view engine", "pug");
app.use(express.static("views"));
//ping
app.get("/", (request, response) => {
  const guildId = request.url.slice(2);
  if (xp.containsKey(guildId)) {
    const guildXP = xp[guildId];
    const guild = client.guilds.cache.get(guildId);
    const userKey = Object.keys(guildXP);
    var tagXP = [];
    for (var i = 0; i < userKey.length; i++) {
      const user = client.users.cache.get(userKey[i]);
      if (!user.bot) {
        tagXP.push({
          user: user,
          xp: guildXP[userKey[i]]
        });
      }
    }
    tagXP.sort((a, b) => {
      return b.xp[0] - a.xp[0];
    });
    var guildRoles = [];
    for (var i = 0; i < 4; i++) {
      if (roles[guildId][i][1] != -1) {
        guildRoles.push({
          role: guild.roles.cache.get(roles[guildId][i][1]).name,
          req: roles[guildId][i][0],
          color: guild.roles.cache.get(roles[guildId][i][1]).hexColor
        });
      }
    }
    var channel;
    if (miniEventChannel[guildId]) {
      channel = guild.channels.cache.get(miniEventChannel[guildId]).name;
    } else {
      channel = "None";
    }
    response.render("index", {
      xp: tagXP,
      miniEventChannel: channel,
      roles: guildRoles
    });
  } else {
    response.send("That page does not exist");
  }
});
app.listen(process.env.PORT);
setInterval(() => {
  http.get(webUrl);
}, 280000);

//when we are ready to run the bot
client.on("ready", () => {
  //parses json
  const load = JSON.parse(fs.readFileSync("xp.json"));
  const loadStyle = JSON.parse(fs.readFileSync("style.json"));
  const loadPrefixes = JSON.parse(fs.readFileSync("prefixes.json"));
  const loadRoles = JSON.parse(fs.readFileSync("roles.json"));
  const miniEventChannel = JSON.parse(
    fs.readFileSync("miniEventChannels.json")
  );
  //sets custom status
  client.user.setActivity({
    name:
      " r!help | Organizing the xp and levels system on the Debates + Chat Network",
    type: "LISTENING"
  });

  //fills guild and xp dictionaries
  client.guilds.cache.array().forEach((guild, i) => {
    if (loadPrefixes.containsKey(guild.id)) {
      prefixes[guild.id] = loadPrefixes[guild.id];
    } else {
      prefixes[guild.id] = "r!";
    }
    if (loadRoles.containsKey(guild.id)) {
      roles[guild.id] = loadRoles[guild.id];
    } else {
      roles[guild.id] = [[-1, -1], [-1, -1], [-1, -1], [-1, -1]];
    }
    var members = {};
    guild.members.cache.array().forEach((member, j) => {
      if (
        load.containsKey(guild.id) &&
        load[guild.id].containsKey(member.user.id)
      ) {
        members[member.user.id] = load[guild.id][member.user.id];
      } else {
        members[member.user.id] = [0, 0];
      }
    });
    xp[guild.id] = members;
  });
  //fills style dictionary
  client.users.cache.array().forEach((user, i) => {
    if (loadStyle.containsKey(user.id)) {
      style[user.id] = loadStyle[user.id];
    } else {
      style[user.id] = ["#ffffff", "sans-serif"];
    }
  });
  //fills streamers dictionary
  setInterval(() => {
    Object.keys(streamers).forEach((userId, i) => {
      var nonBotUsers = 0;
      streamers[userId][1].members.forEach((member, i) => {
        if (!member.user.bot && member.voice.speaking) {
          nonBotUsers += 1;
        }
      });
      if (nonBotUsers > 1) {
        streamers[userId] += 1;
      }
    });
  }, 60000);
  setInterval(startMiniEvent, 30000);
  //console log message
  console.log("Logged in as " + client.user.tag);
});
//streaming xp
client.on("voiceStateUpdate", (oldState, newState) => {
  if (!oldState.streaming && newState.streaming) {
    streamers[newState.member.user.id] = [0, newState.channel];
  }
  if (oldState.streaming && !newState.streaming) {
    xp[newState.guild.id][newState.member.user.id] +=
      streamers[newState.member.user.id][0] * 5;
    delete streamers[newState.member.user.id];
  }
});
//on guild creation, update the dictionaries.
client.on("guildCreate", guild => {
  var members = guild.members.cache.array();
  prefixes[guild.id] = "r!";
  roles[guild.id] = [[-1, -1], [-1, -1], [-1, -1], [-1, -1]];
  var guildXP = {};
  for (var i = 0; i < members.length; i++) {
    guildXP[members[i].user.id] = [0, 0];
    if (!style.containsKey(members[i].user.id)) {
      style[members[i].user.id] = ["#ffffff", "sans-serif"];
    }
  }
  xp[guild.id] = guildXP;
  save();
  savePrefixes();
  saveRoles();
  saveStyle();
});
client.on("roleDelete", role => {
  for (var i = 0; i < 4; i++) {
    if (roles[role.guild.id][i][1] == role.id) {
      roles[role.guild.id][i] = [-1, -1];
    }
  }
  saveRoles();
});
//on member addition, update the dictionaries.
client.on("guildMemberAdd", member => {
  if (!xp[member.guild.id].containsKey(member.user.id)) {
    xp[member.guild.id][member.user.id] = [0, 0];
  }
  if (!style.containsKey(member.user.id)) {
    style[member.user.id] = ["#ffffff", "sans-serif"];
  }
  save();
  saveStyle();
});
//when a guild is deleted, delete their values from the dictionary
client.on("guildDelete", guild => {
  delete xp[guild.id];
  save();
});
//commands for the bot
client.on("message", async msg => {
  //returns if it is a bot that sends a message.
  if (msg.author.bot) {
    return;
  }
  //returns if the message is not in a guild
  if (!msg.guild) {
    return;
  }
  //constants to make writing code easier
  const guild = msg.guild;
  const member = msg.member;
  const user = msg.author;
  const message = msg.content.toLowerCase();
  const prefix = prefixes[guild.id];
  //adds xp
  if (!timers.containsKey(guild.id)) {
    timers[guild.id] = {};
    xp[guild.id][user.id][0] += Math.floor(Math.random() * 7 + 18);
    var level = xp[guild.id][user.id][1];
    if (xp[guild.id][user.id][0] >= (level + 1) * (level + 1) * 100) {
      xp[guild.id][user.id][1] += 1;
    }
    timers[guild.id][user.id] = 0;
    setTimeout(() => {
      delete timers[guild.id][user.id];
    }, 30000);
  }
  if (!timers[guild.id].containsKey(user.id)) {
    xp[guild.id][user.id][0] += Math.floor(Math.random() * 7 + 18);
    var level = xp[guild.id][user.id][1];
    if (xp[guild.id][user.id][0] >= (level + 1) * (level + 1) * 100) {
      xp[guild.id][user.id][1] += 1;
    }
    timers[guild.id][user.id] = 0;
    setTimeout(() => {
      delete timers[guild.id][user.id];
    }, 30000);
  }
  if (msg.content.toLowerCase === "hello" && PopUpEventOn) {
    addXP(msg.guild.id, msg.author.id, miniEventXp);
    PopUpEventOn = false;
    msg.channel.send(msg.author.username + " Has WON!");
  }
  //commands for the bot
  if (message.startsWith(prefix)) {
    //constants to make coding easier
    const nonPrefix = message.substring(prefix.length);
    const msgSplit = nonPrefix.splitSpace();
    const command = msgSplit[0];
    const input = message.substring(prefix.length + command.length + 1);
    const args = msgSplit.splice(1);
    switch (command) {
      //help command that lists out all of the commands
      case "h":
      case "help":
        const helpEmbed = new Discord.MessageEmbed();
        helpEmbed.setTitle("Help");
        helpEmbed.addField(
          "General Commands",
          "**roles** - displays all role requirments. \n **rank | r** - displayes your rank \n **levels | l** - its like the leaderboard but on a website \n **leaderboard** - displays everyone in a leaderboard format but we realized that glitch is unable to comprehend that much data. So it's gone. \n **info | i** - Gives you information about the bot and what it does. \n **color | c** [color] - changes the color of the bar \n **rand** [start num][end num] - returns a random number from start num to end num \n **rgb** [red] [green] [blue] - turns the color of your bar to whatever rgb value you put in"
        );
        helpEmbed.addField(
          "Admin Commands",
          "**role** [0 | 1 | 2 | 3] [level req] [role] - when someone passes the level requirment, it will auto give the role. \n**role-clear** - [0 | 1 | 2 | 3] clears the role with the specific index. \n **clearAll** - clears all xp from every member of the server \n **clear** [members] - clears the member's xp \n **change** [members][amount] - adds the amount to the member's xp \n **prefix** [prefix] - changes the prefix of the bot, using reset as your argument will set it back to r!"
        );
        helpEmbed.setFooter(
          "sujayk#8847, IshanR#7052 and some credit to TheRandomestGuy#6299 made this bot"
        );
        msg.channel.send(helpEmbed);
        break;
      //command with info about the bot
      case "i":
      case "info":
        msg.channel.send(
          "This bot is has a built in leveling system that will have levels depending on the number of messages that he sends and if he go live streams. This is for the D+C Server Network"
        );
        break;
      //command that displays the rank card
      case "r":
      case "rank":
        var userRank = user;
        const mentionedUsers = msg.mentions.users.array();
        if (mentionedUsers.length == 1) {
          userRank = mentionedUsers[0];
        }
        const canvas = Canvas.createCanvas(576, 143);
        const ctx = canvas.getContext("2d");
        var level = xp[guild.id][userRank.id][1];
        var members = guild.members.cache.array();
        var membersXP = [];
        for (var i = 0; i < guild.memberCount; i++) {
          var memberXP = xp[guild.id][members[i].user.id];
          if (!members[i].user.bot) {
            membersXP.push(memberXP);
          }
        }
        membersXP.sort((a, b) => {
          return b[0] - a[0];
        });
        const rank = membersXP.indexOf(xp[guild.id][userRank.id]) + 1;
        const totalbar = 100 * ((level + 1) * (level + 1) - level * level);
        // Since the image takes time to load, you should await it
        const background = await Canvas.loadImage(
          "https://cdn.glitch.com/0f81360e-5016-4699-a527-984e3a840393%2Funtitled.png?v=1585947213483"
        );
        // This uses the canvas dimensions to stretch the image onto the entire canvas
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
        if (userRank.length > 16) {
          // Sets the font of the text
          ctx.font = "10px " + style[userRank.id][1];
        } else {
          // Sets the font of the text
          ctx.font = "20px " + style[userRank.id][1];
        }
        // Select the style that will be used to fill the text in
        ctx.fillStyle = style[userRank.id][0];

        // ctx.fillRect(
        //   canvas.width / 4.6,
        //   canvas.height / 1.88,
        //   (maxBar * (xp[guild.id][user.id] - (level - 1) * (level - 1) * 100)) /
        //     totalbar,
        //   37
        // );

        // Draw a rectangle with the length of the xp
        ctx.fillRect(
          canvas.width / 4.5,
          canvas.height / 1.84,
          (maxBar * (xp[guild.id][userRank.id][0] - level * level * 100)) /
            totalbar,
          33
        );
        // Select which color for the text
        ctx.fillStyle = "#ffffff";
        // Actually fill the text with a solid color
        ctx.fillText(
          userRank.username,
          canvas.width / 4.5,
          canvas.height / 2.1
        );
        // Set new font
        ctx.font = "30px " + style[userRank.id][1];
        // Make more text
        ctx.fillText(
          "#" + rank.toString(),
          canvas.width / 1.75,
          canvas.height / 2.1
        );
        // Make more text
        ctx.fillText(
          "Level " + level.toString(),
          canvas.width / 1.5,
          canvas.height / 4
        );
        // Change the font
        ctx.font = "20px " + style[userRank.id][1];
        // Make MORE text
        ctx.fillText(
          "Needed XP: " +
            (
              100 * (level + 1) * (level + 1) -
              xp[guild.id][userRank.id][0]
            ).toString(),
          canvas.width / 1.5,
          canvas.height / 2.1
        );

        ctx.beginPath();
        ctx.arc(
          canvas.width / 9,
          canvas.height / 2.17,
          35,
          0,
          Math.PI * 2,
          true
        );
        ctx.closePath();

        ctx.stroke();

        ctx.clip();
        // Wait for Canvas to load the image
        const avatar = await Canvas.loadImage(
          userRank.displayAvatarURL({ format: "png" })
        );
        // Draw a shape onto the main canvas
        ctx.drawImage(avatar, canvas.width / 20, canvas.height / 4.7, 70, 70);
        // Use helpful Attachment class structure to process the file for you
        const attachment = new Discord.MessageAttachment(
          canvas.toBuffer(),
          "XPBar.png"
        );
        msg.channel.send(attachment);
        break;
      case "l":
      case "levels":
        msg.channel.send("http://xp-leveling-bot.glitch.me/?" + guild.id);
        break;
      //displays the leaderboard of the guild
//       case "l":
//       case "leaderboard":
//         const leaderboardEmbed = new Discord.MessageEmbed();

//         var text = "";
//         var members = guild.members.cache.array();
//         var membersXP = [];
//         if (guild.memberCount > 5) {
//           var i = 0
//           while(i < 5) {
//             var memberXP = xp[guild.id][members[i].user.id];
//             if (!members[i].user.bot) {
//               membersXP.push([members[i].displayName, memberXP]);
//               i++
//             }
//           }
//         } else {
//           for (var i = 0; i < guild.memberCount; i++) {
//             var memberXP = xp[guild.id][members[i].user.id];
//             if (!members[i].user.bot) {
//               membersXP.push([members[i].displayName, memberXP]);
//             }
//           }
//         }
//         membersXP.sort((a, b) => {
//           return b[1][0] - a[1][0];
//         });
//         for (var i = 0; i < membersXP.length; i++) {
//           text += "\n";
//           text +=
//             "**" +
//             membersXP[i][0] +
//             "** has " +
//             membersXP[i][1][0].toString() +
//             " xp and is level " +
//             membersXP[i][1][1].toString() +
//             "\n";
//         }
//         leaderboardEmbed.setTitle("Leaderboard");
//         leaderboardEmbed.setDescription(text);
//         leaderboardEmbed.setFooter(
//           "sujayk#8847 and IshanR#7052 made this bot and some credit to TheRandomestGuy#6299"
//         );
//         msg.channel.send(leaderboardEmbed);
//         break;
      //administrator command that resets all of the xp in the guild
      case "clearall":
        if (member.hasPermission("ADMINISTRATOR")) {
          const botmsg = await msg.channel.send(
            "Are you sure, this will reset all of the members xp?"
          );
          botmsg.react("✅");
          botmsg.react("❌");
          const filter = (reaction, reacUser) =>
            (reaction.emoji.name === "✅" || reaction.emoji.name === "❌") &&
            reacUser.id === user.id;
          const collector = botmsg.createReactionCollector(filter, {
            time: 30000
          });
          collector.on("collect", r => {
            if (r.emoji.name == "❌") {
              collector.stop("X mark selected");
              botmsg.delete();
              return;
            }
            if (r.emoji.name == "✅") {
              collector.stop("Check mark selected");
              botmsg.delete();
              Object.keys(xp[guild.id]).forEach((userId, i) => {
                xp[guild.id][userId] = [0, 0];
              });
              msg.channel.send("It was Successfull");
            }
          });
          collector.on("end", collected => {
            botmsg.delete();
          });
        } else {
          msg.channel.send("You do not have enough perms to run this command");
        }
        break;
      case "roles":
        for (var i = 0; i < 4; i++) {
          if (roles[guild.id][i][1] != -1) {
            msg.channel.send(
              "Level Requirement: " +
                roles[guild.id][i][0].toString() +
                " \nRole: " +
                guild.roles.cache.get(roles[guild.id][i][1]).name
            );
          }
        }
        break;
      case "role":
        if (member.hasPermission("ADMINISTRATOR")) {
          if (!(args.length >= 2 && msg.mentions.role) && args.length != 3) {
            msg.channel.send("Incorrect Args");
            return;
          }
          const roleMentions = msg.mentions.roles.array();
          if (args[0] == 0 || args[0] == 1 || args[0] == 2 || args[0] == 3) {
            if (isNaN(parseInt(args[1]))) {
              msg.channel.send(
                "Arg at 1 should be an integer of the level requirment"
              );
            } else {
              if (roleMentions.length >= 1) {
                roles[guild.id][parseInt(args[0])] = [
                  parseInt(args[1]),
                  roleMentions[0]
                ];
                msg.channel.send("Success, It finished");
              } else {
                const role = guild.roles.cache.find(
                  role => role.name.toLowerCase() == args[2]
                );
                if (!role) {
                  msg.channel.send("The role name you specified doesn't exist");
                } else if (Array.isArray(role)) {
                  msg.channel.send(
                    "The role name you specified refers to multipule roles"
                  );
                } else {
                  roles[guild.id][parseInt(args[0])] = [
                    parseInt(args[1]),
                    role.id
                  ];
                  msg.channel.send("Success, It finished");
                }
              }
            }
          } else {
            msg.channel.send("Arg at 0 should be 0, 1, 2, or 3");
          }
        } else {
          msg.channel.send("You do not have perms to run this command");
        }
        saveRoles();
        break;
      case "role-clear":
        if (member.hasPermission("ADMINISTRATOR")) {
          if (args.length != 1) {
            msg.channel.send("Invalid number of args");
            return;
          }
          if (args[0] == 0 || args[0] == 1 || args[0] == 2 || args[0] == 3) {
            roles[guild.id][parseInt(args[0])] = [-1, -1];
            msg.channel.send("Success!");
          } else {
            msg.channel.send("Arg at 0 is supposed to be 0, 1, 2, or 3");
          }
        } else {
          msg.channel.send("You do not have perms to run this command");
        }
        saveRoles();
        break;
      //clears the xp of a specific user
      case "clear":
        if (member.hasPermission("ADMINISTRATOR")) {
          var usersMention = msg.mentions.users;
          if (args.length < 1 && usersMention.size < 1) {
            msg.channel.send("You didn't specify who to reset");
            return;
          } else if (usersMention.size > 0) {
            usersMention.forEach((u, key) => {
              xp[guild.id][u.id] = 0;
            });
          } else {
            args.forEach((userString, i) => {
              var tarMember = guild.members.cache.array().find(mem => {
                return (
                  mem.displayName.toLowerCase() === userString.toLowerCase() ||
                  mem.user.username.toLowerCase() === userString.toLowerCase()
                );
              });
              if (tarMember == null) {
                msg.channel.send("Invalid argument at arg " + i.toString());
                return;
              }
              xp[guild.id][tarMember.user.id] = [0, 0];
            });
          }
          msg.channel.send("The Rest Was Successfull");
        } else {
          msg.channel.send("You do not have enough perms to run this command");
        }
        break;
      //changes a users xp
      case "change":
        if (member.hasPermission("ADMINISTRATOR")) {
          var usersMention = msg.mentions.users;
          const change = parseInt(args[args.length - 1]);
          if (args.length < 2 && usersMention.size < 1) {
            msg.channel.send("Invalid args");
          } else if (usersMention.size > 0) {
            usersMention.forEach((u, key) => {
              addXP(guild.id, u.id, change);
            });
          } else {
            const members = args.slice(0, args.length - 1);
            members.forEach((userString, i) => {
              var tarMember = guild.members.cache.array().find(mem => {
                return (
                  mem.displayName.toLowerCase() === userString.toLowerCase() ||
                  mem.user.username.toLowerCase() === userString.toLowerCase()
                );
              });
              if (tarMember == null) {
                msg.channel.send("Invalid argument at arg " + i.toString());
                return;
              }
              if (change < 10000000000000 && change > -10000000000000) {
                addXP(guild.id, tarMember.user.id, change);
                addRoles(guild, tarMember);
              }
            });
          }
          msg.channel.send("The Rest Was Successfull");
        } else {
          msg.channel.send("You do not have enough perms to run this command");
        }
        break;
      //changes the font that will be used on your rank card
      case "f":
      case "font":
        style[user.id][1] = input;
        const fontCanvas = Canvas.createCanvas(576, 143);
        const fontCtx = fontCanvas.getContext("2d");
        fontCtx.font = "50px " + input;
        fontCtx.fillText(input, fontCanvas.width / 5, fontCanvas.height / 1.5);
        const fontAttachment = new Discord.MessageAttachment(
          fontCanvas.toBuffer(),
          "font.png"
        );
        saveStyle();
        msg.channel.send("Successfully, you chose font: ", fontAttachment);
        break;
      case "style":
        msg.channel.send(
          "You font is " +
            style[user.id][1] +
            " and color is " +
            style[user.id][0]
        );
        break;
      //changes the color of the bar that will be used on your rank card
      case "c":
      case "color":
        if (!colorString.get(input)) {
          msg.channel.send("Invalid input, please give an css color");
          return;
        }
        style[user.id][0] = input;
        const colorCanvas = Canvas.createCanvas(576, 143);
        const colorCtx = colorCanvas.getContext("2d");
        colorCtx.fillStyle = input;
        colorCtx.fillRect(0, 0, colorCanvas.width, colorCanvas.height);
        const colorAttachment = new Discord.MessageAttachment(
          colorCanvas.toBuffer(),
          "color.png"
        );
        msg.channel.send("Success, the color you picked is: ", colorAttachment);
        saveStyle();
        break;
      case "rgb":
        if (args.length != 3) {
          msg.channel.send("Invalid number of inputs");
          return;
        }
        style[user.id][0] =
          "rgb(" + args[0] + "," + args[1] + "," + args[2] + ")";
        const rgbCanvas = Canvas.createCanvas(576, 143);
        const rgbCtx = rgbCanvas.getContext("2d");
        rgbCtx.fillStyle = style[user.id][0];
        rgbCtx.fillRect(0, 0, rgbCanvas.width, rgbCanvas.height);
        const rgbAttachment = new Discord.MessageAttachment(
          rgbCanvas.toBuffer(),
          "color.png"
        );
        msg.channel.send("Success, the color you picked is: ", rgbAttachment);
        saveStyle();
        break;
      //picks a random number between the two arguments, inclusive.
      case "rand":
        if (args.length != 2) {
          msg.channel.send("Invalid number of args");
          return;
        }
        const range = parseInt(args[1]) - parseInt(args[0]);
        msg.channel.send(parseInt(args[0]) + Math.round(Math.random() * range));
        break;
      //changes the prefix used in the guild
      case "prefix":
        if (member.hasPermission("ADMINISTRATOR")) {
          if (args.length != 1) {
            msg.channel.send("Invalid args");
            return;
          }
          const botmsg = await msg.channel.send(
            "Are you sure, this will change the prefix of this bot?"
          );
          botmsg.react("✅");
          botmsg.react("❌");
          const filter = (reaction, reacUser) =>
            (reaction.emoji.name === "✅" || reaction.emoji.name === "❌") &&
            reacUser.id === user.id;
          const collector = botmsg.createReactionCollector(filter, {
            time: 15000
          });
          collector.on("collect", r => {
            if (r.emoji.name == "❌") {
              collector.stop("X mark selected");
              botmsg.delete();
              return;
            }
            if (r.emoji.name == "✅") {
              collector.stop("Check mark selected");
              botmsg.delete();
              if (args[0] == "reset") {
                prefixes[guild.id] = "r!";
              } else {
                prefixes[guild.id] = args[0];
              }
              savePrefixes();
              msg.channel.send("Prefix has been set to " + prefixes[guild.id]);
            }
          });
        } else {
          msg.channel.send("You do not have enough perms to run this command");
        }
        break;
      case "mini-event-channel":
        if (member.hasPermission("ADMINISTRATOR")) {
          const botmsg = await msg.channel.send(
            "Are you sure? This will change the place where all mini event xp rounds are displayed" // perfect grammar YES
          );
          botmsg.react("✅");
          botmsg.react("❌");
          const filter = (reaction, reacUser) =>
            (reaction.emoji.name === "✅" || reaction.emoji.name === "❌") &&
            reacUser.id === user.id;
          const collector = botmsg.createReactionCollector(filter, {
            time: 15000
          });
          collector.on("collect", r => {
            if (r.emoji.name == "❌") {
              collector.stop("X mark selected");
              botmsg.delete();
              return;
            }
            if (r.emoji.name == "✅") {
              collector.stop("Check mark selected");
              botmsg.delete();
              miniEventChannel[guild.id] = msg.channel.id;
              saveChannels();
              msg.channel.send(
                "All mini event xp rounds are displayed in " + msg.channel.name
              );
            }
          });
        } else {
          msg.channel.send("You do not have enough perms to run this command");
        }
        break;
      case "mini-event-off":
        if (member.hasPermission("ADMINISTRATOR")) {
          const botmsg = await msg.channel.send(
            "Are you sure? This will turn off mini event xp rounds" // perfect grammar YES
          );
          botmsg.react("✅");
          botmsg.react("❌");
          const filter = (reaction, reacUser) =>
            (reaction.emoji.name === "✅" || reaction.emoji.name === "❌") &&
            reacUser.id === user.id;
          const collector = botmsg.createReactionCollector(filter, {
            time: 15000
          });
          collector.on("collect", r => {
            if (r.emoji.name == "❌") {
              collector.stop("X mark selected");
              botmsg.delete();
              return;
            }
            if (r.emoji.name == "✅") {
              collector.stop("Check mark selected");
              botmsg.delete();
              delete miniEventChannel[guild.id];
              saveChannels();
              msg.channel.send("Turned off mini event xp rounds");
            }
          });
        } else {
          msg.channel.send("You do not have enough perms to run this command");
        }
    }
  }
  addRoles(guild, member);
  save();
});

//logs in with the token of the bot
client.login(token);
