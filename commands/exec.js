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
    let executing_msg = await message.reply("executing...");
    let clibasic_process = exec(`cd tmp/ && clibasic -nrex "${file}"`);
    let start_time = Date.now();
    clibasic_process.stdout.on("data", (data) => {
        if (data.length < 1024) {
            output += data;
        }
    });
    clibasic_process.stderr.on("data", (data) => {
        console.log("stderr: " + data);
    });
    clibasic_process.once("close", (code) => {
        let time = `took \`${(Date.now() - start_time) / 1000}\` seconds`
        let code_str = `Exited with code \`${code}\``;
        const outputEmbed = new MessageEmbed()
            .setColor('#1E11E1')
            .setTitle('Some title')
            .addFields(
		        { name: 'Output', value: `output:\`\`\`\n${output}\n\`\`\`\n${time}\n${code_str}` },
            );
        executing_msg.edit({ embeds: [outputEmbed] });
    });
    setTimeout(() => {
        if (clibasic_process.exitCode === null) {
            clibasic_process.kill(9);
            message.reply(`Process has been killed after running for longer than the maximum ${client.config.maxExecTime ? client.config.maxExecTime : 10000}ms!`)
        }
        fs.unlinkSync(file);
    }, client.config.maxExecTime ? client.config.maxExecTime : 10000);
}

module.exports.help = {
    name: "exec",
    description: "runs clibasic with following code",
    usage: "%PREFIX%exec\n\\`\\`\\`basic\nprint \"Hello, world!\"\n\\`\\`\\`"
}
