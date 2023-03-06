/**
 *              TODO: Catch any errors and send them to testing channel
 *              TODO: Get some data about how many workers are running and resources being used
 *              TODO: Proxies
 *                  -Test and reduce data passed through proxies, mainly images
 *                  -Data center for now, need some extensive testing (this is what beta testing is for)
 *              TODO: Auto message, and on click
 *              TODO: Login in a more universal way
 *              TODO: Put multiple tabs on one worker?
 * 
 *                          TODO: Get that Shmoney
 * 
 * Keep in mind that storing a large number of worker threads in memory can be resource-intensive, so you may want to consider using a database or some other storage solution if you have a very large number of worker threads.
 */

require('dotenv').config();
const { Worker } = require('worker_threads');

//general set up
const fs = require('node:fs');
const path = require('node:path');
const { Client, Events, GatewayIntentBits, Collection } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.login(process.env.DISCORD_BOT_TOKEN);

//command set up
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

const workers = new Map();

//listen for commands
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;
	const command = interaction.client.commands.get(interaction.commandName);

    if(interaction.commandName === "create"){
        let start = interaction.options.getNumber("start");
        let end = interaction.options.getNumber("end");
        let min = interaction.options.getInteger("min");
        let max = interaction.options.getInteger("max");

        //!if user inputs 24, it will be equivilent to currentTime  0

        //time difference
        let timeDiff;
        if(start < end){
            timeDiff = end - start;
        }else{
            timeDiff = 24 - end + start;
        }
    
        //both times are between 1 and 25, the difference is less than or equal to 14
        if(start <= 24 && start >= 1 && end <= 24 && end >= 1 && end !== start && timeDiff <= 16){
            if(min >= 1 && min <= 120 && max >= 1 && max <= 120){
                //sets the name of the worker, name + channel so users can't delete each others workers
                const name = interaction.options.getString("name") + interaction.channelId;
                //!Change the link to force sort by most recent
                workers.set(name, new Worker('./worker.js', { workerData:{
                    name: interaction.options.getString("name"),
                    link: interaction.options.getString("link"),
                    min: min,
                    max: max,
                    start: start * 60,
                    end: end * 60,
                    message: interaction.options.getBoolean("message"),
                    channel: interaction.channelId,
                }}));
            }else{
                client.channels.cache.get(interaction.channelId).send("Error with Interval\nMin and Max must be between 1 and 120 minutes");
            }
        }else{
            client.channels.cache.get(interaction.channelId).send("Error with times\nTimes must be between 1 and 24 with no decimals\nThe interval it runs on must be less than or equal to 16 hours");
        }
    }
    if(interaction.commandName === "delete"){
        const name = interaction.options.getString("name") + interaction.channelId;
        workers.get(name).terminate();
        workers.delete(name);
    }

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});



/*
    *If we ever need to login to do something*

await mainPage.goto('https://www.facebook.com/');
await mainPage.type('#email', 'falk.travis@gmail.com');
await mainPage.type('#pass', 'Bru1ns#18');
await mainPage.click('button[name="login"]');

// Wait for login to complete and navigate to Facebook Marketplace
await mainPage.waitForNavigation();
*/