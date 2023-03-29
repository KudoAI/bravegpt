// ==UserScript==
// @name             BraveGPT 🤖
// @version          2023.03.29
// @author           Adam Lui
// @namespace        https://github.com/adamlui
// @description      Adds ChatGPT answers to Brave Search sidebar
// @homepageURL      https://www.bravegpt.com
// @supportURL       https://github.com/adamlui/bravegpt/issues
// @license          MIT
// @icon             https://raw.githubusercontent.com/adamlui/bravegpt/main/media/images/bravegpt-icon48.png
// @icon64           https://raw.githubusercontent.com/adamlui/bravegpt/main/media/images/bravegpt-icon64.png
// @compatible       chrome
// @compatible       firefox
// @compatible       edge
// @compatible       opera
// @compatible       brave
// @compatible       vivaldi
// @compatible       librewolf
// @compatible       qq
// @match            https://search.brave.com/*
// @connect          api.pawan.krd
// @grant            GM.xmlHttpRequest
// @downloadURL      https://greasyfork.org/scripts/462440/code/bravegpt.user.js
// @updateURL        https://greasyfork.org/scripts/462440/code/bravegpt.meta.js
// ==/UserScript==

(function() {
    var endpointMap = { 'https://api.pawan.krd' : 'pk-pJNAtlAqCHbUDTrDudubjSKeUVgbOMvkRQWMLtscqsdiKmhI' }
    var braveGPTdivAlerts = { tooManyRequests: 'ChatGPT is flooded with too many requests. Check back later!' }

    // Stylize ChatGPT container + children
    var braveGPTstyle = document.createElement('style')
    braveGPTstyle.innerText = `
        .chatgpt-container { word-wrap: break-word ; white-space: pre-wrap ; margin-bottom: 20px }
        .chatgpt-container p { margin: 0 }
        .chatgpt-container .chatgpt-icon { position: relative ; bottom: -4px ; margin-right: 11px }
        .chatgpt-container .prefix { font-size: 20px ; font-family: var(--brand-font) }
        .chatgpt-container .loading { color: #b6b8ba ; animation: pulse 2s cubic-bezier(.4,0,.6,1) infinite }
        .chatgpt-container pre { /* ChatGPT output box */
            /* text spacing */ white-space: pre-wrap ; line-height: 21px ;
            font-family: Consolas, Menlo, Monaco, monospace ;
            /* box spacing */ padding: 0.55em ; margin: .5em 0 ; border-radius: 5px ;
            background-color: #eaeaea
        }
        .chatgpt-container .footer {
            margin: 20px 0 -32px 0 ; padding-top: 17px !important ; font-size: var(--text-sm-2)
            justify-content: right !important
        }
        .chatgpt-container .footer a { margin-right: -22px /* to counter .snippet padding */ }
        .chatgpt-container .feedback { font-family: var(--brand-font) ; color: var(--search-text-06);
            font-size: .65rem ; letter-spacing: .02em ; line-height: 1; position: relative ; right: -222px }
        .chatgpt-container .feedback .icon { fill: currentColor ; color: currentColor ; --size:15px }
        .chatgpt-container .footer a:hover { color: black }
        @keyframes pulse { 0%, to { opacity: 1 } 50% { opacity: .5 }}`
    document.head.appendChild(braveGPTstyle) // append style to <head>

    // Create BraveGPT container & add id/classes
    var braveGPTdiv = document.createElement('div') // create container div
    braveGPTdiv.setAttribute('id', 'infobox')
    braveGPTdiv.setAttribute( // assign Brave's .snippet + custom class
        'class', 'snippet chatgpt-container')

    // Create feedback footer & add class/HTML
    var chatGPTfooter = document.createElement('div') // create footer div
    chatGPTfooter.setAttribute('class', 'footer')
    chatGPTfooter.innerHTML = `<a class="feedback svelte-8js1iq" target="_blank" href="https://github.com/adamlui/userscripts/discussions/new/choose"><svg class="icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 15 15"><path fill-rule="evenodd" d="M.577 6.23a.577.577 0 1 1 0-1.153H1.5a.577.577 0 0 1 0 1.154H.577ZM2.83 8.939a.576.576 0 0 1 0 .816l-1.385 1.385a.573.573 0 0 1-.816 0 .576.576 0 0 1 0-.816l1.385-1.385a.577.577 0 0 1 .816 0ZM.63.985a.576.576 0 1 1 .815-.816L2.83 1.553a.576.576 0 1 1-.816.816L.63.985ZM15 5.654a.577.577 0 0 1-.577.577H13.5a.577.577 0 0 1 0-1.154h.923c.319 0 .577.258.577.577Zm-.631 4.669a.576.576 0 1 1-.816.816l-1.385-1.385a.576.576 0 1 1 .816-.816l1.385 1.385Zm-2.2-7.954a.576.576 0 0 1 0-.816L13.553.17a.577.577 0 0 1 .816.816l-1.385 1.384a.575.575 0 0 1-.816 0ZM9.3 9.09a.579.579 0 0 0-.045.038c-.45.417-.486 1.23-.486 1.47v.238c-1.045.45-2.053.177-2.537-.013v-.226c0-.24-.036-1.053-.487-1.469a.687.687 0 0 0-.044-.037c-.81-.609-1.777-1.667-1.777-3.253 0-2.073 1.604-3.76 3.576-3.76s3.577 1.687 3.577 3.76c0 1.586-.967 2.644-1.777 3.252Zm-1.8 4.757c-.995 0-1.223-.623-1.27-.814v-.997a4.83 4.83 0 0 0 1.343.197c.374 0 .78-.057 1.195-.18v.978c-.05.202-.282.816-1.269.816ZM7.5.923c-2.609 0-4.73 2.204-4.73 4.914 0 1.616.757 3.047 2.192 4.141.058.094.114.39.115.618v2.494c0 .03.003.06.007.09.1.63.732 1.82 2.416 1.82s2.316-1.19 2.416-1.82a.674.674 0 0 0 .006-.09v-2.494c0-.206.054-.525.11-.613 1.438-1.096 2.198-2.528 2.198-4.146 0-2.71-2.121-4.914-4.73-4.914Z" clip-rule="evenodd"></path></svg> Feedback</a>`

    main() // run main routine

    // Functions

    function getUserscriptManager() {
        try { return GM_info.scriptHandler } catch (error) { return 'other' }}

    function braveGPTdivAlert(msg) {
        braveGPTdiv.innerHTML = `<p>${ braveGPTdivAlerts[msg] }</p>` }

    function braveGPTConsoleError(msg) { console.error('🦁 BraveGPT >> ' + msg) }
    function braveGPTConsoleWarn(msg) { console.warn('🦁 BraveGPT >> ' + msg) }

    async function getShowAnswer(question, callback) {
        var userscriptManager = getUserscriptManager()
        if (!getShowAnswer.triedAPIhosts) getShowAnswer.triedAPIhosts = []
        if (!getShowAnswer.attemptCnt) getShowAnswer.attemptCnt = 0

        // Randomize API proxy
        var apiHosts = Object.keys(endpointMap).filter(function(apiHost) {
            return !getShowAnswer.triedAPIhosts?.includes(apiHost) })
        var randomAPIhost = apiHosts[Math.floor(Math.random() * apiHosts.length)]
        var accessKey = endpointMap[randomAPIhost]
        var randomEndpoint = randomAPIhost + '/v1/chat/completions'

        GM.xmlHttpRequest({
            method: 'POST', url: randomEndpoint,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ accessKey }` },
            responseType: 'text',
            data: JSON.stringify({
                messages: [{ role: 'user', content: question }],
                model: 'text-davinci-003',
                max_tokens: 4000
            }),
            onload: onLoad,
            onerror: function(error) { if (getShowAnswer.attemptCnt < 1) {
            	retryDiffHost() } else { braveGPTConsoleError(error) }}
        })

        function retryDiffHost() {
            braveGPTConsoleWarn(`Error calling ${ randomEndpoint }. Trying another endpoint...`)
            getShowAnswer.triedAPIhosts.push(randomAPIhost) // store current API host to not retry
            getShowAnswer.attemptCnt++
            getShowAnswer(question, callback)
        }

        function onLoad(event) {
            if (event.status !== 200 && getShowAnswer.attemptCnt < 1) { retryDiffHost() }
            else if (event.status === 429) { braveGPTdivAlert(braveGPTdivAlerts.tooManyRequests) }
            else if (event.responseText) {
                try {
                    var answer = JSON.parse(event.responseText).choices[0].message.content
                    braveGPTshow(answer) ; getShowAnswer.triedAPIhosts = [] ; getShowAnswer.attemptCnt = 0
                } catch (error) { braveGPTConsoleError('Failed to parse response JSON: ' + error) }
        }}
    }

    function braveGPTshow(answer) {
        braveGPTdiv.innerHTML = `${ navigator.userAgent.includes('Firefox') ? // only load robot emoji in FF + forks
            '<span class="chatgpt-icon"><img width=25 src="https://media.bravegpt.com/images/robot-emoji.png"></span>' : '' }<span class="prefix">ChatGPT</span><pre></pre>`
        braveGPTdiv.querySelector('pre').textContent = answer
        braveGPTdiv.appendChild(chatGPTfooter) // append feedback link
    }

    async function main() {
        braveGPTdiv.innerHTML = '<p class="loading"></p>' // give BraveGPT container spinning loader
        var siderbarContainer = document.querySelector('#side-right')
        siderbarContainer.prepend(braveGPTdiv) // inject BraveGPT container
        getShowAnswer(new URL(window.location.href).searchParams.get('q')) // get/show answer
    }

})()
