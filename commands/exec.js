const { exec } = require("child_process");
const { MessageEmbed } = require('discord.js');
const exec_s = require("child_process").execSync;
const fs = require("fs");

module.exports.cmd = async (client, message, _args) => {
    let code = "";
    let content = message.content
        .substr(client.config.PREFIX.length + 4 /* command length */ + 1 /* new line */);
    content.split("\n")
        .forEach((line) => {
            if (line.match(/^```/)) {
                line += "";
            } else if (line.match(/```$/)) {
                code += line.replace(/```$/, "") + "\n"
            } else {
                code += line + "\n";
            }
        });

    var file = exec_s("echo -n \"$(tempfile -d /tmp -p prog_ -s .bas)\"");
    fs.unlinkSync(file);
    fs.writeFileSync(file, code, { encoding: "utf8" });

    let output = "";
    let executing_msg = await message.reply("Executing...");
    let clibasic_process = exec(`cd tmp/ && clibasic -nrex "${file}"`);
    let start_time = Date.now();

    const outputEmbed = new MessageEmbed();

    clibasic_process.stdout.on("data", (data) => {
        if (data.length < 1024) {
            output += data;
        }
    });
    clibasic_process.stderr.on("data", (data) => {
        console.log("stderr: " + data);
    });
    clibasic_process.once("close", (ecode) => {
        if (output.trim() === "") {output = "\u200B\n";}
        outputEmbed.setColor((ecode == 0 ? '#1E11E1' : '#E1111E')).addFields({ name: 'Output', value: `\`\`\`\n${output}\n\`\`\`__${" ".repeat(34)}   __\n` },).setFooter(`Executed in ${(Date.now() - start_time) / 1000} second(s) with exit code ${ecode}.`);
        executing_msg.edit(`Done. `);
        executing_msg.edit({ embeds: [outputEmbed] });
    });
    setTimeout(() => {
        if (clibasic_process.exitCode === null) {
            clibasic_process.kill(9);
            if (output.trim() === "") {output = "\u200B\n";}
            outputEmbed.setColor('#E1111E').addFields({ name: 'Output', value: `\`\`\`\n${output}\n\`\`\`__${" ".repeat(34)}   __\n` },).setFooter(`Killed after ${(client.config.maxExecTime ? client.config.maxExecTime : 10000) / 1000} second(s).`);
            executing_msg.edit(`Execution limit of ${(client.config.maxExecTime ? client.config.maxExecTime : 10000) / 1000} second(s) has been reached.`);
            executing_msg.edit({ embeds: [outputEmbed] });
        }
        fs.unlinkSync(file);
    }, client.config.maxExecTime ? client.config.maxExecTime : 10000);
}

module.exports.help = {
    name: "exec",
    description: "runs clibasic with following code",
    usage: "%PREFIX%exec\n\\`\\`\\`basic\nprint \"Hello, world!\"\n\\`\\`\\`"
}
