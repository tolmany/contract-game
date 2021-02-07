"use strict";

let devnetGameAccountId = "5DFeyd6tx1kLqUCKNX4ME9nq2eRBjCWu8NG3AQfkXpXBZ7FY";
let contractAbiUrl = "game-metadata.json";

let polkadot = null;

function maybeLoad() {
    window.addEventListener("load", (event) => {
        onLoad();
    });
}

function onLoad() {
    loadApis();
    initPage();
}

function loadApis() {
    console.assert(document.polkadotApiBundle);
    polkadot = document.polkadotApiBundle;
}

function initPage() {
    let nodeStatusSpan = document.getElementById("node-status");
    let nodeEndpointInput = document.getElementById("node-endpoint");
    let nodeConnectButton = document.getElementById("node-connect");

    let gameStatusSpan = document.getElementById("game-status");
    let gameAccountIdInput = document.getElementById("game-account-id");
    let gameCheckButton = document.getElementById("game-check");

    let keyringStatusSpan = document.getElementById("keyring-status");
    let accountKeyInput = document.getElementById("account-key");
    let accountIdSpan = document.getElementById("account-id");
    let keyringConnectButton = document.getElementById("keyring-connect");

    let playerAccountStatusSpan = document.getElementById("player-account-status");
    let playerAccountLevelSpan = document.getElementById("player-account-level");
    let createPlayerAccountButton = document.getElementById("create-player-account");

    gameAccountIdInput.value = devnetGameAccountId;

    nodeEndpointInput.disabled = false;
    nodeConnectButton.disabled = false;

    let api = null;
    let gameAbi = null;
    let gameAccountId = null;
    let keyring = null;
    let keypair = null;

    nodeConnectButton.addEventListener("click", async (event) => {
        let nodeEndpoint = nodeEndpointInput.value;

        setInnerMessageNeutral(nodeStatusSpan, "waiting");

        nodeEndpointInput.disabled = true;
        nodeConnectButton.disabled = true;

        try {
            api = await nodeConnect(nodeEndpoint);

            console.log("api:");
            console.log(api);

            let { chain, nodeName, nodeVersion }
                = await getChainMetadata(api);

            let msg = `Connected to ${chain} using ${nodeName} v${nodeVersion}`;
            console.log(msg);

            setInnerMessageSuccess(nodeStatusSpan, msg);

            gameAccountIdInput.disabled = false;
            gameCheckButton.disabled = false;

        } catch (error) {
            setInnerMessageFail(nodeStatusSpan, error);
            nodeEndpointInput.disabled = false;
            nodeConnectButton.disabled = false;
            return;
        }
    });

    gameCheckButton.addEventListener("click", async (event) => {
        gameAccountIdInput.disabled = true;
        gameCheckButton.disabled = true;

        try {
            let maybeGameAbi = await loadAbi();

            console.log("abi:");
            console.log(maybeGameAbi);
            
            let maybeGameAccountId = gameAccountIdInput.value;

            // Try calling the game contract
            await testGameContract(api, maybeGameAbi, maybeGameAccountId);

            gameAbi = maybeGameAbi;
            gameAccountId = maybeGameAccountId;

            setInnerMessageSuccess(gameStatusSpan, "Online");
            accountKeyInput.disabled = false;
            keyringConnectButton.disabled = false;
        } catch (error) {
            setInnerMessageFail(gameStatusSpan, error);
            gameAccountIdInput.disabled = false;
            gameCheckButton.disabled = false;
        }
    });

    keyringConnectButton.addEventListener("click", async (event) => {
        console.assert(api);

        const accountKey = accountKeyInput.value;

        keyring = new polkadot.Keyring();
        keypair = keyring.addFromUri(accountKey);

        console.log(`Key ${keypair.meta.name}: has address ${keypair.address} with publicKey [${keypair.publicKey}]`);

        let msg = `Connected as ${keypair.address}`;
        setInnerMessageSuccess(keyringStatusSpan, msg);

        accountKeyInput.disabled = true;
        keyringConnectButton.disabled = true;

        try {
            let accountInfo = await loadPlayerAccountInfo(api, keypair);
        } catch (error) {
        }
    });
}

async function nodeConnect(addr) {
    console.log(`Trying to connect to ${addr}`);
    
    const provider = new polkadot.WsProvider(addr);
    const api = await polkadot.ApiPromise.create({ provider });

    return api;
}

async function getChainMetadata(api) {

    const [chain, nodeName, nodeVersion] = await Promise.all([
        api.rpc.system.chain(),
        api.rpc.system.name(),
        api.rpc.system.version()
    ]);

    return {
        chain,
        nodeName,
        nodeVersion
    };
}

async function loadAbi() {
    console.log(`loading game contract ABI from ${contractAbiUrl}`);
    let response = await window.fetch(contractAbiUrl);
    return response.json();
}

async function testGameContract(api, abi, gameAccountId) {
    const contract = new polkadot.ContractPromise(api, abi, gameAccountId);
    console.log("contract:");
    console.log(contract);
    const result = await contract.read("game_ready", 0, 0).send();
    console.log("game_ready result:");
    console.log(result);
    console.log(result.output);
    if (result.output != "heck, yeah") {
        throw new Error("game contract failed init test");
    }
}

async function loadPlayerAccountInfo(api, keypair) {
}

function setInnerMessageSuccess(elt, msg) {
    elt.innerText = msg;
    elt.classList.remove("msg-fail");
    elt.classList.add("msg-success");
}

function setInnerMessageFail(elt, msg) {
    elt.innerText = msg;
    elt.classList.remove("msg-success");
    elt.classList.add("msg-fail");
}

function setInnerMessageNeutral(elt, msg) {
    elt.innerText = msg;
    elt.classList.remove("msg-success");
    elt.classList.remove("msg-fail");
}







maybeLoad();
