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

    let prockilled = 0;
    let procexited = 0;

    clibasic_process.stdout.on("data", (data) => {
        output += data;
    });
    clibasic_process.stderr.on("data", (data) => {
        console.log("stderr: " + data);
    });
    
    function setEmbed(color, output) {
        if (!output || output.trim() === "") {output = output.replace(/(?:\r\n|\r|\n)/g, '\u200B\n') + "\u200B\n";}
        if (output.length > client.config.charLimit) {output = "..." + output.substr(output.length - client.config.charLimit); outputEmbed.setFooter(outputEmbed.footer.text + ` Output was truncated to the ${client.config.charLimit} char limit.`);}
        const splitOutput = output.split('\n');
        if (splitOutput.length > client.config.lineLimit) {output = ""; let i = splitOutput.length - client.config.lineLimi; if (i < 0) {i = 0;} for (; i < splitOutput.length; ++i) {output = output + splitOutput[i] + '\n';} outputEmbed.setFooter(outputEmbed.footer.text + ` Output was truncated to the ${client.config.lineLimit} line limit.`);}
        outputEmbed.setColor(color).addFields({ name: 'Output', value: `\`\`\`\n${output}\n\`\`\`__${" ".repeat(34)}   __\n` },)
    }
    
    clibasic_process.once("close", (ecode) => {
        if (prockilled == 0) {
            outputEmbed.setFooter(`Executed in ${(Date.now() - start_time) / 1000} second(s) with exit code ${ecode}.`);
            setEmbed((ecode == 0 ? client.config.embeds.color : client.config.embeds.error_color), output)
            executing_msg.edit(`Done. `);
            executing_msg.edit({ embeds: [outputEmbed] });
            procexited = 1;
        } else {
            prockilled = 0;
        }
    });
    setTimeout(() => {
        if (clibasic_process.exitCode === null) {
            if (procexited == 0) {
                prockilled = 1;
                let tmpproc = exec_s(`/bin/bash -c 'kill -s SIGTERM ${clibasic_process.pid + 1} || exit 0'`);
                outputEmbed.setFooter(`Killed after ${(client.config.maxExecTime ? client.config.maxExecTime : 10000) / 1000} second(s).`);
                setEmbed(client.config.embeds.error_color, output);
                executing_msg.edit(`Execution limit of ${(client.config.maxExecTime ? client.config.maxExecTime : 10000) / 1000} second(s) has been reached.`);
                executing_msg.edit({ embeds: [outputEmbed] });
            } else {
                procexited = 0;
            }
        }
        fs.unlinkSync(file);
    }, client.config.maxExecTime ? client.config.maxExecTime : 10000);
}

module.exports.help = {
    name: "exec",
    description: "runs clibasic with following code",
    usage: "%PREFIX%exec\n\\`\\`\\`basic\nprint \"Hello, world!\"\n\\`\\`\\`"
}
