/**
 *              TODO: Catch any errors and send them to testing channel
 *              TODO: Get some data about how many workers are running and resources being used
 *              TODO: Proxies
 *                  -Test and reduce data passed through proxies, mainly images
 *                  -Data center for now, need some extensive testing (this is what beta testing is for)
 *              TODO: Message on click
 *              TODO: Put multiple tabs on one worker?
 *              TODO: Add commands for changing message and login info
 *              TODO: Make the message input work
 *              TODO: Restrict number of workers per user
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
const { Client, Events, GatewayIntentBits, Collection, IntegrationExpireBehavior } = require('discord.js');
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

const users = new Map();

//listen for commands
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;
	const command = interaction.client.commands.get(interaction.commandName);
    
	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}

    if(interaction.commandName === "facebook-create-parent"){
        //checks if user is already created
        if(!users.has(interaction.user.id)){
            users.set(interaction.user.id, {
                facebook: new Map(),
                ebay: new Map()
            })
        }

        if(!users.get(interaction.user.id).facebook.has(interaction.options.getString("name"))){
            users.get(interaction.user.id).facebook.set(interaction.options.getString("name"), {
                username: interaction.options.getString("username"),
                password: interaction.options.getString("password"),
                autoMessage: interaction.options.getBoolean("auto-message"),
                message: interaction.options.getString("message"),
                children: new Map()
            });
            client.channels.cache.get(interaction.channelId).send("Created " + interaction.options.getString("name"));
            console.log(users.get(interaction.user.id).facebook);
        }else{
            client.channels.cache.get(interaction.channelId).send({ content: "This name is already used", ephemeral: true });
        }
    }
    else if(interaction.commandName === "facebook-create-child"){
        //checks if user exists
        if(users.has(interaction.user.id)){
            //checks if parent exists
            if(users.get(interaction.user.id).facebook.has(interaction.options.getString("parent-name"))){
                if(!users.get(interaction.user.id).facebook.get(interaction.options.getString("parent-name")).children.has(interaction.options.getString("name"))){
                    //!restrict number here
                    if(interaction.options.getString("link").includes("sortBy=creation_time_descend")){
                        let start = interaction.options.getNumber("start");
                        let end = interaction.options.getNumber("end");
                
                        //time difference
                        let timeDiff;
                        if(start < end){
                            timeDiff = end - start;
                        }else{
                            timeDiff = 24 - end + start;
                        }
                    
                        //both times are between 1 and 25, the difference is less than or equal to 14
                        if(start <= 24 && start >= 1 && end <= 24 && end >= 1 && end !== start && timeDiff <= 16){
                            //get parent element from map and set new worker as a child
                            let parent = users.get(interaction.user.id).facebook.get(interaction.options.getString("parent-name"))
                            users.get(interaction.user.id).facebook.get(interaction.options.getString("parent-name")).children.set(interaction.options.getString("name"), new Worker('./facebook.js', { workerData:{
                                name: interaction.options.getString("name"),
                                link: interaction.options.getString("link"),
                                username: parent.username,
                                password: parent.password,
                                message: parent.message,
                                start: start * 60,
                                end: end * 60,
                                autoMessage: parent.autoMessage,
                                channel: interaction.channelId,
                            }}));
                            client.channels.cache.get(interaction.channelId).send("Created " + interaction.options.getString("name"));
                        }else{
                            client.channels.cache.get(interaction.channelId).send({ content: "Search must sort by most recent", ephemeral: true });
                        }
                    }else{
                        client.channels.cache.get(interaction.channelId).send({ content: "Error with times\nTimes must be between 1 and 24 with no decimals\nThe interval it runs on must be less than or equal to 16 hours", ephemeral: true });
                    }
                }else{
                    client.channels.cache.get(interaction.channelId).send({ content: "A child with this name already exists", ephemeral: true });
                }
            }else{
                client.channels.cache.get(interaction.channelId).send({ content: "Parent does not exist", ephemeral: true });
            }
            console.log(users.get(interaction.user.id).facebook);
        }else{
            client.channels.cache.get(interaction.channelId).send({ content: "Parent does not exist", ephemeral: true });
        }
    }
    else if(interaction.commandName === "facebook-delete-child"){
        if(users.has(interaction.user.id)){
            if(users.get(interaction.user.id).facebook.has(interaction.options.getString("parent-name"))){
                let parent = users.get(interaction.user.id).facebook.get(interaction.options.getString("parent-name"));
                if(parent.children.has(interaction.options.getString("child-name"))){
                    parent.children.get(interaction.options.getString("child-name")).terminate();
                    parent.children.delete(interaction.options.getString("child-name"));
                    client.channels.cache.get(interaction.channelId).send("Deleted " + interaction.options.getString("child-name"));
                }else{
                    client.channels.cache.get(interaction.channelId).send({ content: "Child does not exist", ephemeral: true });
                }
            }else{
                client.channels.cache.get(interaction.channelId).send({ content: "Parent does not exist", ephemeral: true });
            }
            console.log(users.get(interaction.user.id).facebook);
        }else{
            client.channels.cache.get(interaction.channelId).send({ content: "Parent does not exist", ephemeral: true });
        }
    }
    else if(interaction.commandName === "facebook-delete-parent"){
        if(users.has(interaction.user.id)){
            if(users.get(interaction.user.id).facebook.has(interaction.options.getString("name"))){
                let parent = users.get(interaction.user.id).facebook.get(interaction.options.getString("name"));
                parent.children.forEach((child) => {
                    child.terminate();
                });
                users.get(interaction.user.id).facebook.delete(interaction.options.getString("name"));
                client.channels.cache.get(interaction.channelId).send("Deleted " + interaction.options.getString("name"));
            }else{
                client.channels.cache.get(interaction.channelId).send({ content: "Parent does not exist", ephemeral: true });
            }
            console.log(users.get(interaction.user.id).facebook);
        }else{
            client.channels.cache.get(interaction.channelId).send({ content: "Parent does not exist", ephemeral: true });
        }
    }
    else if(interaction.commandName === "list"){
        let list;
        let user = users.get(interaction.user.id);
        //check to see if facebook has workers
        list += "\nFacebook:"
        user.facebook.forEach((parent, parentKey) => {
            list += `\n\t${parentKey}`
            parent.children.forEach((child, childKey) => {
                list += `\n\t\t${childKey}`
            })
        })

        //samezies for Ebay dontcha know 
        client.channels.cache.get(interaction.channelId).send(list);
    }
});