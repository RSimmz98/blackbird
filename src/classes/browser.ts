import { Builder, By, Key, until } from 'selenium-webdriver';

export class Browser {

    driver
    page

    async init(){
        this.driver = await new Builder().forBrowser('chrome').build();
        return this
    }

    randomInt(min:number, max:number){
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    async getDriver(){  
        return this.driver;
    }





    async goToPage(url:string, waitby:string = "", waitarg:string = "", timeout:number = 10000){
        await this.driver.get(url)

        if(waitby != ""){
            if (waitby == "css"){
                await this.driver.wait(until.elementLocated(By.css(waitarg)), 10000)
            }
        }
        
    }

    async scrollPage(scrollMax:number = 1000, scrollUnit: number = 10, sleepAfter:number = 0){

        let scrolledAmount = 0
        let sleepMax = scrollMax / sleepAfter
        let sleepAmount = 0

        for (let index = 0; index < scrollMax/scrollUnit; index++) {
            
            scrolledAmount = index * scrollUnit

            // Sleep after some scroll amount
            if (sleepAfter > 0 && sleepAmount < sleepMax){
                if ((scrolledAmount - (sleepAfter * sleepAmount)) >= sleepAfter){
                    await this.driver.sleep(this.randomInt(1,2) * 1000)
                    sleepAmount += 1            
                }
            }

            // Scroll
            await this.driver.executeScript(`window.scrollBy(0, ${scrollUnit})`)
            
        }
            
    }

    async sendKeys(selectorBy:string, selectorByArg:string, keys:string, minDelay:number = 1, maxDelay:number=2){

        let element = await this.getElement(selectorBy, selectorByArg)

        for (let index = 0; index < keys.length; index++) {
            const key = keys[index];
            
            if (minDelay > 0 && maxDelay > 0){
                await this.driver.sleep(this.randomInt(minDelay, maxDelay) * 1000)
            }

            await element.sendKeys(key)
        }
    }

    async getElement(by:string, arg:string){
        if (by == "css"){
            return await this.driver.findElement(By.css(arg))
        }
    }

    async getElements(by:string, arg:string){
        if (by == "css"){
            return await this.driver.findElements(By.css(arg))
        }
    }

    async findButtonAndClick(buttonText:string){
        let script = `let buttons = document.querySelectorAll("[role='button']")
        for (let index = 0; index < buttons.length; index++) {
            const element = buttons[index];
            if (element.innerText == "${buttonText}"){
                element.click()
                break
            }
        }`

        await this.driver.executeScript(script)
    }

    async getCurrentWindowHandle(){
        let handle = await this.driver.getWindowHandle()
        return handle
    }

    async ctrlClickElement(element:any, currenWindowHandle:any){
        await this.driver.actions().keyDown(Key.CONTROL).click(element).keyUp(Key.CONTROL).perform()

        await this.driver.wait(
            async () => (await this.driver.getAllWindowHandles()).length > 1,
            10000
          );

        let handles = await this.driver.getAllWindowHandles()

        return handles.filter(handle => handle != currenWindowHandle)[0]
    }

    async switchTab(handle:string){
        await this.driver.switchTo().window(handle)
    }

    async waitForElement(waitby:string, waitarg:string, timeout:number = 10000){
        if (waitby == "css"){
            await this.driver.wait(until.elementLocated(By.css(waitarg)), timeout)
        }
    }

    async syncExecuteJS (script:string){
        return await this.driver.executeScript(script)
    }

    getCurrentPage(){
        return this.page;
    }

}