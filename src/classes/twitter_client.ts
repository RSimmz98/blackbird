
import { isThisTypeNode } from 'typescript'
import { Browser } from './browser'
import { username, password } from '../constants'

export class TwitterClient{

    browser: Browser

    constructor(browser: Browser){
        this.browser = browser
    }

    async login(){
        try{

            await this.browser.goToPage(
                "https://twitter.com/i/flow/login",
               )

            await this.browser.driver.sleep(this.browser.randomInt(6,10) * 1000)
            await this.browser.waitForElement( "css",
            "[autocomplete='username']",
            20000)

            // Enter username 
            await this.browser.sendKeys("css", "[autocomplete='username']", username, 0,0)
            await this.browser.driver.sleep(this.browser.randomInt(1,2))
            await this.browser.findButtonAndClick("Next")

            // Enter password
            await this.browser.waitForElement("css", 'input[type="password"]')
            // await this.browser.driver.sleep(10000)
            await this.browser.sendKeys("css", 'input[type="password"]', password, 0,0)
            await this.browser.driver.sleep(this.browser.randomInt(1,3))
            await this.browser.findButtonAndClick("Log in")

            await this.browser.waitForElement("css", '[aria-label="Tweet"]')

            let tweetButton = await this.browser.getElement("css", '[aria-label="Tweet"]')

            if (tweetButton){
                console.log("Login success")
                return true
            }else{
                console.log("Login failed")
                return false
            }
        }catch(e){
            console.log(e)
        }

    }

    async getTrends(){
        try{
            await this.browser.goToPage(
                "https://twitter.com/i/trends",
                "css",
                '[aria-label="Timeline: Trends"]')


            await this.browser.waitForElement("css", "[data-testid='trend']")

            // Scroll to the very bottom of the page
            let start = 1000
            await this.browser.scrollPage(start, 10, 50)
            
            // Scrape all trends
            let trendsScript = `let rawTrends = document.querySelectorAll('[data-testid="trend"]');
            let allTrends = [];

            for (let i = 0; i < rawTrends.length; i++){
                let t = rawTrends[i]
               let tList = t.innerText.split(String.fromCharCode(0x0A))
                allTrends.push({
                    details: tList[0],
                    name: tList[1],
                    tweets: tList[2]
                })
            }



            return allTrends;`


            let trendsList =  await this.browser.syncExecuteJS(trendsScript)
            return trendsList


        }catch(e){
            console.log(e)
        }
    }

    async tweet(tweet: string){
        try {
            let tweetElement = await this.browser.getElement("css", '[aria-label="Tweet"]')
            tweetElement.click()

            await this.browser.waitForElement("css", "[data-testid='tweetTextarea_0']")
            await this.browser.sendKeys("css", "[data-testid='tweetTextarea_0']", tweet, 1 , 2)
            await this.browser.driver.sleep(this.browser.randomInt(1,3))
            let tweetButton = await this.browser.getElement("css", "[data-testid='tweetButton']")
            tweetButton.click()

        }catch(e){
            console.log(e)
        }
    }

    async getUserInfo(username:string){

        try{
            await this.browser.goToPage(
                "https://twitter.com/" + username,
                "css",
                '[alt="Opens profile photo"]')


            await this.browser.driver.sleep(this.browser.randomInt(1,5))


            let scrapUserScript = `
                let userNameRaw = document.querySelector('[data-testid="UserName"]')
                                  .innerText.split(String.fromCharCode(0x0a))

                let displayname = userNameRaw[0]
                let userName = userNameRaw[1]
                let bio = document.querySelector('[data-testid="UserDescription"]')?.innerText
                let location = document.querySelector('[data-testid="UserLocation"]')?.innerText
                let url = document.querySelector('[data-testid="UserUrl"]')?.innerText
                let professionalCategory = document.querySelector('[data-testid="UserProfessionalCategory"]')?.innerText
                let following = document.querySelector('[href="/${username}/following"]')?.innerText
                let followers = document.querySelector('[href="/${username}/followers"]')?.innerText
                let photo = document.querySelector('[alt="Opens profile photo"]')?.src

                let userDetails = {
                    displayname,
                    userName,
                    bio,
                    location,
                    url,
                    professionalCategory,
                    following,
                    followers,
                    photo
                }

                return userDetails`

            let result = await this.browser.syncExecuteJS(scrapUserScript)
            return result
        }catch (e){
            console.log(e)
        }
    }

    async fetchTweets(source: string, amount: number){

        try {
            await this.browser.goToPage(source)
            await this.browser.driver.sleep(this.browser.randomInt(6,10) * 1000)


            await this.browser.waitForElement("css",
            'article[data-testid="tweet"]',
            60000)
            
            let currenWindowHandle = await this.browser.getCurrentWindowHandle()
            let finalTweets = []
            let maxRetries = 5
            let foundTweets = 0
            let scrapedTweets = 0

            while (foundTweets < amount ){
                

                let tweets = await this.browser.getElements("css", 'article[data-testid="tweet"]')
                
                for (let index = 0; index < tweets.length; index++) {
                    const tweet = tweets[index];
                    let newTabHandle;
                    try{
                        newTabHandle = await this.browser.ctrlClickElement(tweet, currenWindowHandle)

                        if (newTabHandle == null || newTabHandle == undefined){
                            console.log("Error opening new tab")
                            continue
                        }
                    }catch(e){
                        console.log(e)
                        continue
                    }

                    await this.browser.switchTab(newTabHandle)
                    await this.browser.driver.sleep(this.browser.randomInt(1,5) * 1000)


                    let isTweet = await this.browser.syncExecuteJS(`return window.location.href.includes("https://twitter.com/") && window.location.href.includes("status")`)

                    if (!isTweet){
                        console.log("[!] Ad found....skipping!")
                        await this.browser.driver.close()
                        await this.browser.switchTab(currenWindowHandle)
                        continue
                    }


                    await this.browser.waitForElement("css", 'article[data-testid="tweet"]', 20000)


                    // Scrap data here
                    console.log("[!] Scrapping tweet!")
                    let scrapeTweetScript = `
                            let tweetUrlPaths = window.location.href.split("/").filter(f => f != "")
                            let tweetId = tweetUrlPaths[tweetUrlPaths.length - 1]
                            let tweetUsername = tweetUrlPaths[2]
                            let tweetText = document.querySelector('article[role="article"]')?.childNodes[0]?.childNodes[0]?.childNodes[0]?.childNodes[2]?.childNodes[0]?.innerText
                            let tweetImages = document.querySelector('article[role="article"]').childNodes[0]?.childNodes[0]?.childNodes[0]?.querySelectorAll("img")
                            let tweetMedia = Array.from(tweetImages).map(i => i.src)
                            let tweetRetweets = document.querySelector('[href="/'+ tweetUsername + '/status/'+ tweetId +'/retweets"]')?.innerText.split(String.fromCharCode(0x0a))[0]
                            let tweetQouteRetweets = document.querySelector('[href="/'+ tweetUsername + '/status/'+ tweetId +'/retweets/with_comments"]')?.innerText.split(String.fromCharCode(0x0a))[0]
                            let tweetLikes = document.querySelector('[href="/'+ tweetUsername + '/status/'+ tweetId +'/likes"]')?.innerText.split(String.fromCharCode(0x0a))[0]
                            let tweetMetaRaw = document.querySelector('article[role="article"]')?.childNodes[0]?.childNodes[0]?.childNodes[0]?.childNodes[2]?.childNodes[2]?.innerText.split("·")
                            let tweetMeta
                            try{
                                tweetMeta = {
                                    time: tweetMetaRaw[0],
                                    date: tweetMetaRaw[1],
                                    source: tweetMetaRaw[2]
                                }
                            }catch(e){
                                tweetMeta = {
                                    time: "",
                                    date: "",
                                    source: ""
                                }
                            }

                            return {
                                tweetId,
                                tweetUsername,
                                details: {
                                    text: tweetText,
                                    media: tweetMedia,
                                },
                                engament: {
                                    retweets: tweetRetweets,
                                    qouteRetweets: tweetQouteRetweets,
                                    likes: tweetLikes
                                },
                                meta: tweetMeta
                            }`

                    let tweetData = await this.browser.syncExecuteJS(scrapeTweetScript)

                    finalTweets.push(tweetData)
                    foundTweets++
                    await this.browser.driver.close()
                    await this.browser.switchTab(currenWindowHandle)

                    console.log(`[!] Scrapped Tweets ${foundTweets}/${amount}`)

                    if (foundTweets >= amount){
                        return finalTweets
                    }
                    
                   
                }


                // Delete processed tweets
                let deleteProcessedTweetsScript = `
                            let processedTweets = document.querySelectorAll('article[data-testid="tweet"]')
                            processedTweets.forEach(tweet =>  tweet.remove())
                `

                await this.browser.syncExecuteJS(deleteProcessedTweetsScript)

                // Scroll to the very bottom of the page
                this.browser.scrollPage(1000, 200, 0)
                await this.browser.waitForElement("css", 'article[data-testid="tweet"]', 20000)

                
                
            }

            return finalTweets
        }catch(e){
            console.log(e)
        }

    }



}