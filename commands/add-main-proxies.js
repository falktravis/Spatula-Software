const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('add-main-proxies')
		.setDescription('Add new packet stream proxies to main account db')
        .addStringOption(option => 
            option.setName('proxy-list')
                .setDescription('list of proxies in their natural form')
                .setRequired(true)),
	async execute(interaction) {
		await interaction.reply(`Adding main proxies...`);
	},
};