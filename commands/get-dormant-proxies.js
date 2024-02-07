const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('get-dormant-proxies')
		.setDescription('Private command to return ordered proxies')
        .addStringOption(option => 
            option.setName('50')
                .setDescription('fifty plan proxies')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('25')
                .setDescription('twenty-five plan proxies')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('10')
                .setDescription('ten plan proxies')
                .setRequired(true)),
	async execute(interaction) {
		await interaction.editReply(`warming account...`);
	},
};