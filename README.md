# twitch-cw-command

A simple tool to add a content warning command to your Twitch chat.

After setting up the command, entering `!cw` in the chat will check the currently set category, and if it is game respond with the game's URL on [doesthedogdie.com](https://doesthedogdie.com).

## Getting Started

The easiest way to get started is via [Glitch](https://glitch.com).
If you don't mind dealing with running a web server, check out the [Advanced Setups](#advanced-setups) section to learn more.

### Remix on Glitch

If you already have a Glitch account you can just remix the project.

1. Go to [glitch.com](https://glitch.com) and log in with your account.
2. Visit the [cw-command project](https://glitch.com/edit/#!/twitch-cw-command) on Glitch.
3. Hit the _Remix_ button to remix (=duplicate) the project for yourself.
4. Once the project is ready, you can click the _Share_ button and copy the URL you can find under _Live site_
5. Take this new live URL (it should have a random 3-word string in it) and use it in your streaming software (OBS etc.) as the URL for a browser source.
6. Make sure you follow the instructions under [Integration into OBS](#integration-into-obs) below on how to use that URL.

### Where do I start with changes to the code?

**Be aware** that anything inside the `build` folder is automatically generated code that shouldn't be edited.

- `src/main.js`: If you want to make changes, for example to the texts etc., check out `src/main.js`.

## Integration into OBS

This guide describes OBS, but it should work almost identical in other streaming software.

### Prerequisites

You need to decide under which account the response to the command should be posted to the chat. This can be your own account or any bot account that you have login access to.

1. Visit the [Twitch Chat OAuth Password Generator](https://twitchapps.com/tmi/) and click _connect_.
2. Log in with the right Twitch account. You have to log in with the Twitch account that should respond in the chat.
3. Copy the complete token (starting with and including `oauth:...`) and store it privately for yourself only. We will need it in the next steps.

### Integration

Take the URL under which the tool is running. In case you remixed on Glitch, the URL should be something similar to `https://rando-url-soup.glitch.me`. Here's how you integrate it into OBS.

Add a browser source and as the URL you input:

```
https://rando-url-soup.glitch.me?channel=XYZ&token=oauth:ABC
```

Substitute `XYZ` with the channel name where you want the `!cw` command to do its thing. And substitute `oauth:ABC` with the token you generated (see [Prerequisites](#prerequisites)).

You can then hide the browser source. It just needs to be integrated as a source but does not need to be visible. If you have it visible it will show you status information in your scene (for example, if it is stopped or running).

## Advanced Setups

### Running Local Development Server

1. Fetch the codebase with git.
2. Within the codebase folder run `npm install` to install all necessary dev packages.
3. With `npm start` you open up a dev server under `http://localhost:3000`.
4. Make sure you follow the instructions under [Integration into OBS](#integration-into-obs) on how to user that URL.

### Running On a Web Server

#### Downloading Pre-built Code

You can download the pre-built code from the GitHub repository directly. The `build` folder should contain all the files that need to be served from a web server.

Go to _Releases_ and pick the latest version and download the source code under _Assets_. Take the source code from the `build` folder and serve it from a server.

Make sure you follow the instructions under [Integration into OBS](#integration-into-obs) on how to user that URL.

#### Building the Code Yourself

1. Fetch the codebase with git.
2. Within the codebase folder run `npm install` to install all necessary dev packages.
3. With `npm run build` the code is built into the `build` folder, which can then be served by any web server or service that serves static files.
4. Make sure you follow the instructions under [Integration into OBS](#integration-into-obs) on how to user that URL.
